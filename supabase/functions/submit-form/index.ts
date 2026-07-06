// Public endpoint for form submissions on user-published sites.
// Anyone can POST here; we resolve form_key to a site owner and store the lead.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Very small in-process IP rate limiter: 10/min per IP per cold start.
const ipHits = new Map<string, number[]>();
function ipRateLimit(ip: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (ipHits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) { ipHits.set(ip, arr); return false; }
  arr.push(now);
  ipHits.set(ip, arr);
  return true;
}

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  // IPv4 private ranges
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = +m[1], b = +m[2];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
  }
  // IPv6 loopback / link-local / ULA
  if (h === '::1' || h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd')) return true;
  return false;
}

function isSafeForwardUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    if (isPrivateHost(u.hostname)) return false;
    return true;
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req.headers.get('cf-connecting-ip')
    || 'unknown';
  const ua = req.headers.get('user-agent') ?? null;

  if (!ipRateLimit(ip)) return json(429, { error: 'rate_limited', message: 'Too many submissions, slow down.' });

  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: 'invalid_json' }); }

  const { form_key, form_name, fields, _gb_hp } = body ?? {};
  if (typeof form_key !== 'string' || form_key.length < 8) return json(400, { error: 'missing_form_key' });
  if (fields && typeof fields !== 'object') return json(400, { error: 'invalid_fields' });
  if (typeof _gb_hp === 'string' && _gb_hp.trim() !== '') {
    // Honeypot filled → pretend success, drop silently.
    return json(200, { ok: true });
  }
  const fieldObj = (fields && typeof fields === 'object') ? fields : {};
  const keys = Object.keys(fieldObj);
  if (keys.length > 50) return json(400, { error: 'too_many_fields' });
  const size = new TextEncoder().encode(JSON.stringify(fieldObj)).byteLength;
  if (size > 10_240) return json(413, { error: 'payload_too_large' });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Resolve form_key to owner (apps first, then pages)
  let owner: { user_id: string; source_type: 'app'|'page'; source_id: string; forward_url: string | null } | null = null;

  const { data: app } = await supabase
    .from('published_apps')
    .select('id, user_id, forward_url')
    .eq('form_key', form_key)
    .eq('is_published', true)
    .maybeSingle();
  if (app) owner = { user_id: app.user_id, source_type: 'app', source_id: app.id, forward_url: app.forward_url ?? null };

  if (!owner) {
    const { data: page } = await supabase
      .from('shared_previews')
      .select('id, user_id, forward_url')
      .eq('form_key', form_key)
      .eq('is_published', true)
      .maybeSingle();
    if (page) owner = { user_id: page.user_id, source_type: 'page', source_id: page.id, forward_url: page.forward_url ?? null };
  }

  if (!owner) return json(404, { error: 'unknown_form_key' });

  // Per-site daily cap (500/day)
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const { count: dayCount } = await supabase
    .from('form_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('source_type', owner.source_type)
    .eq('source_id', owner.source_id)
    .gte('created_at', dayAgo);
  if ((dayCount ?? 0) >= 500) {
    return json(429, { error: 'site_daily_cap' });
  }

  // Monthly tier cap per owner
  const { data: tierRow } = await supabase
    .from('subscriptions').select('tier').eq('user_id', owner.user_id).maybeSingle();
  const tier = tierRow?.tier ?? 'free';
  const { data: limitRow } = await supabase
    .from('tier_limits').select('form_submissions_per_month').eq('tier', tier).maybeSingle();
  const monthLimit = limitRow?.form_submissions_per_month ?? 100;

  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0,0,0,0);
  const { count: monthCount } = await supabase
    .from('form_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', owner.user_id)
    .gte('created_at', monthStart.toISOString());
  if ((monthCount ?? 0) >= monthLimit) {
    return json(429, { error: 'monthly_limit_reached', limit: monthLimit });
  }

  // Forward if configured
  let forwarded_status: 'none' | 'sent' | 'failed' = 'none';
  if (owner.forward_url) {
    if (!isSafeForwardUrl(owner.forward_url)) {
      forwarded_status = 'failed';
    } else {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 10_000);
        const r = await fetch(owner.forward_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            form_name: form_name ?? null,
            fields: fieldObj,
            submitted_at: new Date().toISOString(),
            source: { type: owner.source_type, id: owner.source_id },
          }),
          signal: ctrl.signal,
        });
        clearTimeout(t);
        forwarded_status = r.ok ? 'sent' : 'failed';
      } catch {
        forwarded_status = 'failed';
      }
    }
  }

  const { error: insErr } = await supabase.from('form_submissions').insert({
    user_id: owner.user_id,
    source_type: owner.source_type,
    source_id: owner.source_id,
    form_name: typeof form_name === 'string' ? form_name.slice(0, 200) : null,
    data: fieldObj,
    ip,
    user_agent: ua,
    forwarded_status,
  });
  if (insErr) return json(500, { error: 'insert_failed' });

  return json(200, { ok: true, forwarded: forwarded_status });
});