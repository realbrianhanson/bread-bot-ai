

## Plan: Add Missing Manus-Level Features

### What's needed

Based on the current orchestrator toolset, these are the highest-impact additions to reach Manus-level capability:

### 1. Google Sheets Integration
- New edge function: `supabase/functions/create-google-sheet/index.ts`
- Uses same OAuth tokens from `user_integrations` table (already stored with `drive.file` scope)
- Need to add `https://www.googleapis.com/auth/spreadsheets` scope to the OAuth flow
- Accepts: title, headers, rows data, optional folderId
- Creates sheet via Google Sheets API, populates with data
- Add `create_google_sheet` tool to orchestrator

### 2. Update Google OAuth Scopes
- Update `supabase/functions/google-oauth/index.ts` to include Sheets scope
- Users who already connected will need to reconnect to get the new scope

### 3. Email Sending via Resend Connector
- Connect the Resend connector (already available)
- New edge function: `supabase/functions/send-email/index.ts`
- Uses Resend connector gateway to send formatted emails
- Add `send_email` tool to orchestrator (recipient, subject, html content)

### 4. URL File Download Tool
- Add a `download_file` tool to the orchestrator
- Downloads files from URLs and stores them in the `generated-files` storage bucket
- Useful for grabbing PDFs, images, datasets from the web

### 5. Wire Everything into Orchestrator
- Add new tool definitions to `orchestrate-task/index.ts`
- Add tool execution handlers for each new tool
- Update system prompt with new chaining strategies

### Technical Details

**Google Sheets function** follows the same pattern as `create-google-doc`:
- Reuses `getValidAccessToken()` helper
- Google Sheets API: `POST https://sheets.googleapis.com/v4/spreadsheets` to create
- Then `PUT .../values/{range}` to populate data
- Returns sheet URL

**Email function** uses the Resend connector gateway:
- `POST https://connector-gateway.lovable.dev/resend/emails`
- Headers: `Authorization: Bearer ${LOVABLE_API_KEY}`, `X-Connection-Api-Key: ${RESEND_API_KEY}`

**Download file** uses fetch + Supabase Storage:
- Fetches the URL, uploads to `generated-files` bucket under user's folder
- Returns a signed URL for download

### Files to create/modify
1. **Create** `supabase/functions/create-google-sheet/index.ts`
2. **Create** `supabase/functions/send-email/index.ts`
3. **Modify** `supabase/functions/google-oauth/index.ts` — add Sheets scope
4. **Modify** `supabase/functions/orchestrate-task/index.ts` — add 3 new tools
5. **Modify** `src/hooks/useChat.ts` — handle new tool result types in chat display

### Order of implementation
1. Google Sheets (leverages existing OAuth infrastructure)
2. Update OAuth scopes
3. Email via Resend (requires connector setup)
4. Download file tool
5. Test end-to-end

