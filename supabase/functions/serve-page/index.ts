// Public edge function: serves a published page as real HTML with proper meta tags.
// Lookup order: ?slug= query param, else Host header -> custom_domains -> shared_preview.
// Increments views server-side via increment_page_views RPC. Light IP-based rate limit.
import { createClient } from 'npm:@supabase/supabase-js@2.84.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Minimal in-process rate limiter: 60 lookups / ip / minute.
const ipHits = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || entry.resetAt < now) {
    ipHits.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  entry.count += 1;
  return entry.count <= 60;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHead(html: string): string {
  // Remove any pre-existing <title>, <meta name="description">, canonical, and og:* tags
  // so we don't emit duplicates when we inject our own.
  return html
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\s+[^>]*name=["']description["'][^>]*>/gi, '')
    .replace(/<link\s+[^>]*rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<meta\s+[^>]*property=["']og:[^"']+["'][^>]*>/gi, '');
}

function injectHead(html: string, meta: { title: string; description: string; canonical: string }): string {
  const cleaned = stripHead(html);
  const tags = `
    <title>${escapeHtml(meta.title)}</title>
    <meta name="description" content="${escapeHtml(meta.description)}" />
    <link rel="canonical" href="${escapeHtml(meta.canonical)}" />
    <meta property="og:title" content="${escapeHtml(meta.title)}" />
    <meta property="og:description" content="${escapeHtml(meta.description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(meta.canonical)}" />
  `;
  if (/<head[^>]*>/i.test(cleaned)) {
    return cleaned.replace(/<head[^>]*>/i, (m) => `${m}${tags}`);
  }
  // No <head>? Wrap the doc.
  return `<!doctype html><html><head><meta charset="utf-8" />${tags}</head><body>${cleaned}</body></html>`;
}

function notFound(): Response {
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>Page not found · GarlicBread.ai</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body{background:#0a0a0f;color:#e6e6ea;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0}
    .card{max-width:420px;padding:40px;text-align:center}
    h1{font-size:28px;margin:0 0 12px}
    p{color:#8a8a95;line-height:1.55}
    a{color:#a78bfa;text-decoration:none}
  </style></head>
  <body><div class="card"><h1>Page not found</h1><p>This page isn't published, or the domain isn't connected yet.</p><p><a href="https://garlicbread.ai">Back to GarlicBread.ai</a></p></div></body></html>`;
  return new Response(body, { status: 404, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || 'unknown';
  if (!rateLimit(ip)) {
    return new Response('Too many requests', { status: 429, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const querySlug = url.searchParams.get('slug');
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const host = forwardedHost.split(':')[0].toLowerCase();

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  let previewId: string | null = null;
  let slug: string | null = null;

  if (querySlug) {
    slug = querySlug.toLowerCase();
  } else if (host) {
    const { data: domain } = await supabase
      .from('custom_domains')
      .select('shared_preview_id, verified')
      .eq('domain', host)
      .eq('verified', true)
      .maybeSingle();
    if (!domain) return notFound();
    previewId = domain.shared_preview_id;
  } else {
    return notFound();
  }

  const q = supabase
    .from('shared_previews')
    .select('id, slug, title, description, html_content, is_published')
    .eq('is_published', true)
    .maybeSingle();

  const { data: page } = previewId ? await q.eq('id', previewId) : await q.eq('slug', slug!);
  if (!page || !page.html_content) return notFound();

  // fire-and-forget view increment
  supabase.rpc('increment_page_views', { p_slug: page.slug }).then(() => {}, () => {});

  const canonical = host && !querySlug
    ? `https://${host}/`
    : `https://garlicbread.ai/p/${page.slug}`;

  const html = injectHead(page.html_content, {
    title: page.title || 'Published page',
    description: page.description || 'A page published with GarlicBread.ai',
    canonical,
  });

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=300',
      'X-Robots-Tag': 'index, follow',
    },
  });
});