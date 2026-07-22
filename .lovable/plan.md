## Fix Dashboard freezing during streaming

Stop Sandpack from remounting on every streamed token. Three surgical edits, no workflow changes.

### Edit 1 — `src/hooks/useChat.ts`
- Remove any `setCodeVersion(v => v + 1)` calls inside the streaming/token handler.
- Increment `codeVersion` exactly once, inside the stream `done`/completion branch (after final code is parsed).

### Edit 2 — `src/components/chat/CodePreview.tsx`
- Wrap the incoming `files`/`code` prop in `useDeferredValue` so Sandpack updates in the background rather than blocking.
- Ensure the Sandpack root's `key` does not include a value that changes per-token; only remount on intentional refresh (post-stream `codeVersion` bump or manual reset).

### Edit 3 — `src/pages/Dashboard.tsx`
- Keep `codeVersion` in the `CodePreview` `key` (it now only changes on completion, which is the desired remount trigger).
- Avoid passing streaming-only state into `CodePreview`; only pass the finalized code snapshot.

### Constraints
- No changes to models, edge functions, publish pipeline, version history, or design tokens.
- No new dependencies.

### Verification
- Trigger a build prompt, confirm preview stays mounted during streaming and refreshes once on completion.
- Confirm no Sandpack iframe reloads mid-stream (Network tab: no repeated bundler requests).
