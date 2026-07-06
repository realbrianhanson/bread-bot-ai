# Custom Domains — Production Wiring

This project ships the app-layer plumbing for connecting user-owned domains to
published pages (`custom_domains` table, `serve-page` function, `verify-domain`
function, and the Connect Domain UI). To actually serve customer traffic on
their own hostname you also need the edge/TLS layer described here.

## Overview

```
 customer.example.com ─┐            ┌── serve-page (Supabase Edge Function)
                       │            │      https://<project-ref>.functions.supabase.co/serve-page
                       ▼            │
          Cloudflare for SaaS  ─►  Fallback Origin Worker  ─►  serve-page?host=<hostname>
          (per-hostname TLS)
```

1. Customer adds a `CNAME` (or apex ALIAS) pointing their domain at
   `pages.garlicbread.ai`.
2. Cloudflare for SaaS (Custom Hostnames) issues a TLS certificate per hostname
   automatically (HTTP-01 or TXT validation).
3. Cloudflare routes the request to the SaaS zone's **fallback origin**, a
   tiny Cloudflare Worker.
4. The Worker forwards the request (preserving the original `Host` header via
   `x-forwarded-host`) to the `serve-page` edge function, which looks the host
   up in `custom_domains`, streams the published HTML, and injects meta tags.

## 1. DNS: `pages.garlicbread.ai`

Create a single fallback record in the `garlicbread.ai` zone that customers
will CNAME to:

```
pages.garlicbread.ai   CNAME   <cloudflare-for-saas-fallback-hostname>
```

The exact target is provided when you enable Custom Hostnames on the zone.

## 2. Cloudflare for SaaS setup

In the Cloudflare dashboard for the `garlicbread.ai` zone:

- **SSL/TLS → Custom Hostnames → Enable**
- Fallback origin: `pages.garlicbread.ai`
- Certificate authority: Let's Encrypt (default) or Google Trust Services
- Validation methods: HTTP + TXT (enable both — customers behind proxies often
  can't do HTTP-01)
- Wildcards: off (we issue per-hostname)

Customers register hostnames via the Cloudflare API (`POST
/zones/{zone_id}/custom_hostnames`), typically triggered by a future
`register-hostname` edge function. For MVP the customer's CNAME to
`pages.garlicbread.ai` and TXT ownership record are enough — you can add
hostnames manually in the dashboard.

## 3. The fallback-origin Worker

Deploy a Cloudflare Worker at `pages.garlicbread.ai` (route:
`pages.garlicbread.ai/*`). It only exists to preserve the original Host and
forward to the Supabase function.

```js
// worker.js
const TARGET = 'https://<project-ref>.functions.supabase.co/serve-page';
const ANON  = '<SUPABASE_ANON_KEY>'; // publishable key, safe to bundle

export default {
  async fetch(request) {
    const original = new URL(request.url);
    const host = request.headers.get('host') || '';
    const target = new URL(TARGET);
    // preserve path for future extensions; serve-page currently ignores it
    target.pathname += original.pathname === '/' ? '' : original.pathname;
    target.search = original.search;

    const headers = new Headers(request.headers);
    headers.set('x-forwarded-host', host);
    headers.set('apikey', ANON);
    headers.set('Authorization', `Bearer ${ANON}`);

    return fetch(target.toString(), {
      method: request.method,
      headers,
      body: ['GET','HEAD'].includes(request.method) ? undefined : request.body,
    });
  },
};
```

`wrangler.toml`:

```toml
name = "garlicbread-pages"
main = "worker.js"
compatibility_date = "2025-01-01"
routes = [ { pattern = "pages.garlicbread.ai/*", zone_name = "garlicbread.ai" } ]
```

## 4. Supabase env / secrets referenced

`serve-page` and `verify-domain` use:

| Secret                       | Where                                | Purpose                             |
| ---------------------------- | ------------------------------------ | ----------------------------------- |
| `SUPABASE_URL`               | auto-provided                        | Supabase project URL                |
| `SUPABASE_ANON_KEY`          | auto-provided                        | Anon key for auth-scoped clients    |
| `SUPABASE_SERVICE_ROLE_KEY`  | auto-provided                        | Server-role lookups + updates       |

No new secrets needed for MVP.

## 5. Supabase function URL pattern

```
https://<PROJECT_REF>.functions.supabase.co/serve-page?host=<domain>
https://<PROJECT_REF>.functions.supabase.co/serve-page?slug=<slug>
https://<PROJECT_REF>.functions.supabase.co/verify-domain      (POST, Bearer JWT)
```

The Worker forwards the original `Host` as `x-forwarded-host`; `serve-page`
prefers that header over `Host` when present.

## 6. Customer setup they see in the UI

In the Connect Domain dialog we show:

1. `TXT`  `_garlicbread-verify.{domain}`  →  `{verification_token}`
2. `CNAME`  `{domain}`  →  `pages.garlicbread.ai`

Once (1) resolves, `verify-domain` flips `verified=true`. Once (2) resolves and
Cloudflare for SaaS has issued a certificate for `{domain}`, the site is live.

## 7. Operational notes

- Rate-limit: `serve-page` has a small in-process IP limiter (60 req/min per
  cold-start) as basic enumeration protection. Push serious limits to the
  Cloudflare layer (WAF / rate-limiting rules on `pages.garlicbread.ai`).
- Caching: `serve-page` returns `Cache-Control: public, max-age=60, s-maxage=300`.
  Cloudflare edge caches per hostname automatically.
- Removal: deleting the row in `custom_domains` immediately breaks resolution
  because `serve-page` will 404 on lookup. Also remove the hostname from
  Cloudflare for SaaS to release the cert slot.
## Published apps (App Builder)

Custom domains can point at either a **published page** (`shared_previews`) or a
**published app** (`published_apps`, built by App Builder and served from the
`app-builds` storage bucket). The `custom_domains.published_app_id` column
distinguishes the two; a CHECK constraint enforces that exactly one target is
set per row.

Routing is unchanged at the edge — the Worker still forwards every request to
`serve-page`. `serve-page` looks up the host in `custom_domains`:

- If the row has `shared_preview_id` set, it serves the page HTML directly (as
  before).
- If the row has `published_app_id` set, it returns a `307` redirect to
  `serve-app` with the resolved slug in the path. The browser then loads the
  app's `index.html`, `/assets/*`, and any subroutes from the new function.

### `serve-app` function URL

```
https://<project-ref>.functions.supabase.co/serve-app/{slug}/
https://<project-ref>.functions.supabase.co/serve-app/{slug}/assets/<file>
```

The trailing slash on `/{slug}/` matters: apps are built with Vite `base: './'`,
so asset URLs are relative to the current directory. Requests to `/{slug}`
without a trailing slash get a `301` back to `/{slug}/` automatically.

### Storage layout

```
app-builds/
  <userId>/
    apps/
      <slug>/
        v1/    index.html, assets/…
        v2/    (bumped on republish)
    <taskId>/
      snapshot.tar.gz   (project source for edits + export)
      exports/<ts>.zip  (short-lived download bundles)
```

Only `serve-app` (and the sandbox-manager service role) needs to read the
`apps/` prefix. The bucket is private; all public reads flow through the edge
function so we can enforce `is_published` and set correct MIME + cache headers.

### Worker update (no change required, but for clarity)

The same fallback Worker used for pages already handles apps: it forwards the
original `Host` to `serve-page`, and `serve-page` transparently redirects to
`serve-app` for app-targeted domains. If you'd prefer to short-circuit the
redirect (one less hop), you can teach the Worker to detect the redirect
response and re-issue the request against `serve-app` directly.

### Environment

No new secrets are required beyond the existing `SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY` used by every edge function.
