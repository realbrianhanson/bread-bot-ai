# Forms on Published Sites

Every user-published page (`shared_previews`) and app (`published_apps`) can
capture form submissions. Submissions land in `form_submissions` and, if a
webhook is configured, are forwarded to the site owner's endpoint (GoHighLevel,
Zapier, Make, custom, etc.).

## Endpoint

```
POST https://<PROJECT_REF>.functions.supabase.co/submit-form
Content-Type: application/json
```

CORS is fully open (`*`) so any static site on any custom domain can call it
without preflight configuration on the site's end.

## Payload

```json
{
  "form_key": "fk_<hex>",
  "form_name": "contact",
  "fields": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "message": "I would like a demo."
  },
  "_gb_hp": ""
}
```

- `form_key` — the site's unique key. Generators inject the correct value at
  build/publish time; you should never hand-craft it.
- `form_name` — free text label used to distinguish forms on the same site.
- `fields` — flat object. Up to 50 keys, up to 10 KB serialized.
- `_gb_hp` — hidden honeypot. Must be present and empty. If a bot fills it,
  the API returns `{ ok: true }` but silently drops the submission.

## Responses

| Status | Body | Meaning |
| ------ | ---- | ------- |
| 200    | `{ ok: true, forwarded: "sent" \| "failed" \| "none" }` | Stored (and forwarded if configured) |
| 400    | `{ error: "invalid_json" \| "missing_form_key" \| "too_many_fields" }` | Bad request |
| 404    | `{ error: "unknown_form_key" }` | No published site owns this key |
| 413    | `{ error: "payload_too_large" }` | Fields JSON over 10 KB |
| 429    | `{ error: "rate_limited" \| "site_daily_cap" \| "monthly_limit_reached", limit }` | Throttled |

## Limits

- **Per IP:** 10 submissions / minute (in-process, resets on cold start)
- **Per site:** 500 submissions / rolling 24 h
- **Per owner monthly cap** from `tier_limits.form_submissions_per_month`:
  - Free: 100
  - Pro: 5 000
  - Business / Enterprise / Lifetime: 25 000

## Forward-URL rules

If the site has `forward_url` set, the function POSTs

```json
{
  "form_name": "contact",
  "fields": { ... },
  "submitted_at": "2026-07-06T20:14:00.000Z",
  "source": { "type": "app", "id": "<uuid>" }
}
```

with a 10-second timeout. The URL **must be HTTPS**, and the destination
cannot resolve to a private/internal address (loopback, RFC1918, link-local,
ULA). Failures set `forwarded_status = "failed"` on the stored row but never
block the submission itself.

## GoHighLevel setup

1. In GHL, open **Automation → Workflows → New Workflow → Inbound Webhook**.
2. Copy the webhook URL (starts with `https://services.leadconnectorhq.com/hooks/...`).
3. In GarlicBread.ai, open the site's publish panel and paste the URL into
   **Send leads to webhook**. Click **Send test** to fire a sample payload —
   GHL will show it under the workflow's execution log so you can map fields.
4. Save, then add downstream steps in GHL (create contact, tag, send email).

## Honeypot & templates

Every form the generators emit includes the required hidden input:

```html
<input type="text" name="_gb_hp" tabindex="-1" autocomplete="off"
       style="position:absolute;left:-9999px;opacity:0;pointer-events:none"
       aria-hidden="true" />
```

If you write custom forms, include this input and pass its value as `_gb_hp`
in the JSON body. The submit-form endpoint drops any request where the
honeypot is non-empty.