// Authenticated: verifies a custom domain by checking DNS TXT record via Cloudflare DoH.
// Owner-only, tier-gated (pro/enterprise/lifetime), never trusts client tier claims.
import { createClient } from 'npm:@supabase/supabase-js@2.84.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAID_TIERS = new Set(['pro', 'enterprise', 'lifetime']);

function j(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return j(405, { error: 'method_not_allowed' });

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return j(401, { error: 'missing_auth' });

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !user) return j(401, { error: 'invalid_token' });

  let body: { domainId?: string };
  try { body = await req.json(); } catch { return j(400, { error: 'invalid_json' }); }
  const domainId = body.domainId;
  if (!domainId || typeof domainId !== 'string') return j(400, { error: 'missing_domainId' });

  const svc = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // Tier check server-side — never trust client
  const { data: sub } = await svc.from('subscriptions').select('tier').eq('user_id', user.id).maybeSingle();
  const tier = (sub?.tier ?? 'free').toLowerCase();
  if (!PAID_TIERS.has(tier)) {
    return j(402, { error: 'upgrade_required', message: 'Custom domains require Pro or Business.' });
  }

  const { data: row, error: rowErr } = await svc
    .from('custom_domains')
    .select('id, user_id, domain, verification_token, verified')
    .eq('id', domainId)
    .maybeSingle();
  if (rowErr || !row) return j(404, { error: 'not_found' });
  if (row.user_id !== user.id) return j(403, { error: 'forbidden' });

  const dnsName = `_garlicbread-verify.${row.domain}`;

  let txtRecords: string[] = [];
  try {
    const dnsRes = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(dnsName)}&type=TXT`,
      { headers: { accept: 'application/dns-json' } },
    );
    if (!dnsRes.ok) return j(502, { error: 'dns_query_failed' });
    const dns = await dnsRes.json();
    const answers: Array<{ data: string }> = dns.Answer ?? [];
    txtRecords = answers.map((a) => (a.data || '').replace(/^"|"$/g, '').replace(/"\s+"/g, ''));
  } catch {
    return j(502, { error: 'dns_query_failed' });
  }

  const match = txtRecords.some((t) => t.trim() === row.verification_token);
  if (!match) {
    return j(200, { verified: false, expected: row.verification_token, found: txtRecords, dnsName });
  }

  const { error: updateErr } = await svc
    .from('custom_domains')
    .update({ verified: true, verified_at: new Date().toISOString() })
    .eq('id', row.id);
  if (updateErr) return j(500, { error: 'update_failed' });

  return j(200, { verified: true, domain: row.domain });
});