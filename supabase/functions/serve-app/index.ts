// Public edge function: serves a published App Builder app from Cloud storage.
// Route shape (behind fallback origin / worker rewriting Host to slug):
//   GET /{slug}                 -> index.html
//   GET /{slug}/assets/<path>   -> asset with correct content-type + long cache
// Host-based resolution: matches Host header against custom_domains.published_app_id.
import { createClient } from 'npm:@supabase/supabase-js@2.84.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MIME: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  mjs: 'application/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  txt: 'text/plain; charset=utf-8',
  map: 'application/json; charset=utf-8',
};

function contentTypeFor(pathname: string): string {
  const ext = pathname.split('.').pop()?.toLowerCase() || '';
  return MIME[ext] || 'application/octet-stream';
}

// Vite hashed asset filenames look like `<name>-<hash>.<ext>` — safe to cache forever.
function isImmutableAsset(pathname: string): boolean {
  return /\/assets\/.+-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/.test(pathname);
}

// tiny IP-based rate limit (mirrors serve-page)
const ipHits = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || entry.resetAt < now) {
    ipHits.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  entry.count += 1;
  return entry.count <= 240; // higher than serve-page because apps pull many assets
}

function notFound(): Response {
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>App not found · GarlicBread.ai</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body{background:#0a0a0f;color:#e6e6ea;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0}
    .card{max-width:420px;padding:40px;text-align:center}
    h1{font-size:28px;margin:0 0 12px}
    p{color:#8a8a95;line-height:1.55}
    a{color:#a78bfa;text-decoration:none}
  </style></head>
  <body><div class="card"><h1>App not found</h1><p>This app isn't published, or the domain isn't connected yet.</p><p><a href="https://garlicbread.ai">Build one with GarlicBread.ai</a></p></div></body></html>`;
  return new Response(body, { status: 404, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } });
}

function serverError(msg: string): Response {
  return new Response('Server error: ' + msg, { status: 500, headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || 'unknown';
  if (!rateLimit(ip)) return new Response('Too many requests', { status: 429, headers: corsHeaders });

  const url = new URL(req.url);
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // Parse: strip Supabase's `/functions/v1/serve-app` prefix if present, then extract slug + asset path.
  let path = url.pathname.replace(/^\/functions\/v1\/serve-app/, '') || '/';
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const host = forwardedHost.split(':')[0].toLowerCase();

  let slug: string | null = null;
  let assetPath = 'index.html';

  // 1) Explicit ?slug=... (used by our own preview iframe)
  const querySlug = url.searchParams.get('slug');
  if (querySlug) {
    slug = querySlug.toLowerCase();
    if (path && path !== '/') assetPath = path.replace(/^\//, '');
  } else {
    // 2) Custom domain resolution
    if (host && host !== 'localhost' && !host.endsWith('.supabase.co') && !host.endsWith('.functions.supabase.co')) {
      const { data: domain } = await supabase
        .from('custom_domains')
        .select('published_app_id, verified')
        .eq('domain', host)
        .eq('verified', true)
        .not('published_app_id', 'is', null)
        .maybeSingle();
      if (domain?.published_app_id) {
        const { data: app } = await supabase
          .from('published_apps')
          .select('slug')
          .eq('id', domain.published_app_id)
          .eq('is_published', true)
          .maybeSingle();
        if (app) {
          slug = app.slug;
          assetPath = path === '/' ? 'index.html' : path.replace(/^\//, '');
        }
      }
    }
    // 3) Path-based: /{slug} or /{slug}/assets/...
    if (!slug) {
      const m = path.match(/^\/([a-z0-9][a-z0-9-]{2,80})(?:\/(.*))?$/);
      if (m) {
        slug = m[1];
        assetPath = m[2] && m[2].length > 0 ? m[2] : 'index.html';
      }
    }
  }

  if (!slug) return notFound();

  // For `base: './'` to resolve assets correctly under /{slug}/, requests to /{slug} must
  // redirect to /{slug}/ so the browser treats the slug as the current directory.
  if (assetPath === 'index.html' && !querySlug && !path.endsWith('/') && path !== '/') {
    const dest = new URL(url.toString());
    dest.pathname = dest.pathname.replace(/(\/functions\/v1\/serve-app)?\/([a-z0-9][a-z0-9-]{2,80})$/, (_full, prefix, s) => `${prefix || ''}/${s}/`);
    return Response.redirect(dest.toString(), 301);
  }

  const { data: app, error: appErr } = await supabase
    .from('published_apps')
    .select('storage_prefix, is_published')
    .eq('slug', slug)
    .maybeSingle();
  if (appErr || !app || !app.is_published) return notFound();

  // Defense in depth: prevent traversal via .. or absolute paths.
  if (assetPath.includes('..') || assetPath.startsWith('/')) return notFound();

  const storagePath = `${app.storage_prefix.replace(/\/$/, '')}/${assetPath}`;

  const { data: blob, error: dlErr } = await supabase.storage.from('app-builds').download(storagePath);
  if (dlErr || !blob) {
    // SPA fallback: if the asset lookup fails and this wasn't itself index.html or under /assets, serve index.html so client-side routers work.
    if (assetPath !== 'index.html' && !assetPath.startsWith('assets/')) {
      const { data: fallback } = await supabase.storage.from('app-builds').download(`${app.storage_prefix.replace(/\/$/, '')}/index.html`);
      if (fallback) {
        return new Response(fallback, {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
        });
      }
    }
    return notFound();
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const cache = isImmutableAsset('/' + assetPath)
    ? 'public, max-age=31536000, immutable'
    : (assetPath === 'index.html' ? 'public, max-age=60' : 'public, max-age=3600');

  return new Response(bytes, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': contentTypeFor(assetPath),
      'Cache-Control': cache,
      'X-Robots-Tag': 'index, follow',
    },
  });
});