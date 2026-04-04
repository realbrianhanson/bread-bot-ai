

## Plan: Add Google OAuth Secrets

### Steps
1. **Add `GOOGLE_CLIENT_ID` secret** — prompt you to paste the Client ID from Google Cloud Console
2. **Add `GOOGLE_CLIENT_SECRET` secret** — prompt you to paste the Client Secret
3. **Verify** the google-oauth edge function can use them by checking deployment status

### No code changes needed
The edge functions (`google-oauth`, `create-google-doc`, `create-google-sheet`) already reference `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` via `Deno.env.get()`. Once the secrets are set, everything will work.

