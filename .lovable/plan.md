

## Plan: Add Honcho Secrets

No code changes needed — this is a secrets configuration task only.

### Steps

1. **Add `HONCHO_API_KEY` secret** — prompt you to paste your API key from app.honcho.dev
2. **Add `HONCHO_WORKSPACE_ID` secret** — prompt you to paste the workspace UUID
3. **Deploy the `honcho-proxy` edge function** to ensure it picks up the new secrets
4. **Test** by calling the honcho-proxy status endpoint to verify connectivity

### What This Enables
Once both secrets are set, the existing Honcho integrations will activate:
- Chat will gain persistent memory across sessions
- Orchestrator will personalize research tasks
- Settings → Memory tab will show learned user context

