# App Builder Batch A — Implementation Plan

Five interlocking upgrades to the sandbox-manager pipeline. Grouping the work so migrations run first (approval gate), then edge functions, then UI.

## 1. Database (single migration)

- New table `public.published_apps`:
  - `id uuid pk`, `user_id uuid` (references `auth.users`), `task_id uuid`, `name text`, `slug text unique`, `storage_prefix text`, `version int default 1`, `is_published bool default true`, `created_at`, `updated_at`.
  - `updated_at` trigger. RLS: owner can read/insert/update/delete their own rows; `service_role` bypass. `authenticated` GRANT; no `anon`.
- Alter `custom_domains`: add `published_app_id uuid null` referencing `published_apps.id on delete cascade`, plus a CHECK ensuring exactly one of `shared_preview_id` / `published_app_id` is set (drop the old NOT NULL on `shared_preview_id`).
- No schema changes needed on `tasks` — new statuses (`completed_partial`) and fields (`qa_report`, `verification`) live in the existing `output_data jsonb`.

## 2. Edge functions

### `sandbox-manager` (large edit)
- Add actions: `publish`, `unpublish`, `export`.
- **Publish**: in the live sandbox (or by rehydrating the snapshot tarball if expired), set Vite `base: './'` in the skeleton config, `run_command npm run build`, then walk `dist/` and stream every file to storage at `app-builds/<userId>/<appId>/v<version>/…`. Upsert `published_apps` row (bumping `version` and `storage_prefix` on republish). Return `{ url, slug, version }`.
- **Unpublish**: flip `is_published = false`.
- **Export**: zip source (skip `node_modules`, `dist`, `.git`); if sandbox expired, download the snapshot tarball, unpack in a Deno tmp dir, re-zip, upload to `app-builds/<userId>/<appId>/exports/<ts>.zip`, return a 10-minute signed URL.
- **Runner recovery ladder** inside the existing build loop:
  - Wrap Anthropic calls in `callAnthropic()` with 3 retries + exponential backoff on 429/5xx/network errors.
  - On `stop_reason: "max_tokens"`, append an assistant continuation prompt ("split large write_file calls, continue") and loop instead of failing.
  - **Sandbox keepalive**: while a build is running, `setSandboxTimeout(45*60*1000)` every 5 minutes via a `setInterval`.
  - **Runtime verification** after `check_build`: fetch preview root URL (must be 200 and non-empty HTML shell), then parse `<script src>` / `<link href>` from the HTML and HEAD each asset. On failure, inject a `verification_failed` tool result back into the loop and force one more fix turn (still bounded by MAX_TURNS).
  - **MAX_TURNS exhaustion**: instead of `failed`, snapshot the sandbox, mark task `completed_partial` with `output_data.needs_continue = true` and a `summary` explaining the truncation.
- **Auto-QA**: after `completed` (not `completed_partial`), if the user has `browser_task` quota remaining (call `check_and_increment_usage` with dry-run pattern — actually just invoke browser-task and let it enforce), invoke `browser-task` with the same QA prompt used in the UI, tag `source: 'auto_qa'` and store the returned task id in `output_data.qa_task_id`. A separate lightweight `qa-collect` step is not needed: browser-task webhook already stores results; the UI polls `qa_task_id` and reads `task_results` to render the report and, when finished, writes `output_data.qa_report` back through sandbox-manager `attach_qa` action (small helper).

### `serve-app` (new, public — mirrors `serve-page`)
- `GET /{slug}` → `index.html` from storage.
- `GET /{slug}/assets/*` → the asset with correct `Content-Type` (map by extension) and `Cache-Control: public, max-age=31536000, immutable` for hashed files, short cache for html.
- Host header resolution via `custom_domains.published_app_id` (same path as serve-page).
- Branded 404 identical style to serve-page.
- `config.toml`: add `[functions.serve-app] verify_jwt = false`.

### `serve-page` (small edit)
- Extend Host resolution to first check for `published_app_id`; if present, 302 to `serve-app` for that slug rather than returning page HTML. Keeps existing shared_preview flow intact.

## 3. Skeleton change

- In the FILE_INDEX_HTML / vite.config skeleton written by sandbox-manager, set `base: './'` so production builds work under `/{slug}/` on serve-app without hardcoding the slug.

## 4. UI — `src/pages/AppBuilder.tsx`

- New buttons on `completed` / `completed_partial` builds:
  - **Publish** (or **Republish v{n+1}** if already published) → calls `sandbox-manager publish`, shows the permanent URL with copy + open buttons and an **Unpublish** control.
  - **Download code** → calls `sandbox-manager export`, opens the signed URL.
- **QA results card**: when `output_data.qa_report` is present, render a card with the findings and an **Apply these fixes** button that pre-fills `editPrompt` with the QA report and submits an edit run. Manual **QA Test** button stays.
- **Continue building** affordance when `status === 'completed_partial'`: highlight the existing edit textarea, pre-fill with `"Continue where you left off. Complete any unfinished sections and fix broken pieces."`, add a distinct banner.
- Poll `qa_task_id` (existing pattern) to surface the QA report as soon as browser-task finishes; when it's terminal, POST `attach_qa` so it persists on the build row.

## 5. Docs

- Append a **Published apps** section to `DOMAINS.md` covering the new `published_app_id` column, `serve-app` function URL, and the Cloudflare worker snippet updated to route Host → `serve-app` when the app id is set (else `serve-page`).

## Technical notes / risk

- Auto-QA quota: browser-task already enforces `check_and_increment_usage`; if it 402s, sandbox-manager just records `qa_skipped_reason: 'quota'`.
- Republish version bump keeps old versions in storage — cleanup is out of scope for this batch (noted as TODO in code comment).
- Runtime verification does not fetch cross-origin assets (only same-origin `/assets/*` paths from index.html) to avoid false negatives.
- Zip creation uses `jsr:@zip-js/zip-js` (pure JS, works in Deno edge runtime).
- Snapshot restoration for `export` on expired sandbox reads the existing `snapshot_path` field the runner already writes.
- Keepalive uses E2B's `sandbox.setTimeout(ms)` (supported by the sdk used today).

## Out of scope for batch A

- Storage GC for old published versions.
- Signed asset auth for private builds (all published apps are public by design).
- Auto-QA re-runs after edit — only fires on the initial `completed` transition.

Approve to proceed and I'll implement in order: migration → serve-app + config → sandbox-manager runner + actions → AppBuilder UI → DOMAINS.md.
