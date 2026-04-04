

## Plan: Fix Sandpack "Couldn't connect to server" Timeout

### Problem
When generating a website in the chat, the CodePreview component uses Sandpack (CodeSandbox's in-browser bundler). Sandpack needs to connect to `https://codesandbox.io` bundler servers. Inside the Lovable preview iframe, this connection frequently times out, producing the "Couldn't connect to server / TIME_OUT" error -- especially with the `static` template.

### Solution
Replace Sandpack with a simple `<iframe srcdoc>` approach for static HTML previews. For `react-ts` templates, keep Sandpack but add a timeout fallback that shows the HTML version instead.

### Changes

**1. Rewrite `src/components/chat/CodePreview.tsx`**

- For `static` and `vanilla` templates: skip Sandpack entirely. Use the existing `buildCombinedHTML()` function to produce a self-contained HTML string and render it via `<iframe srcdoc={html}>`. This is instant, requires no external server, and works reliably in any environment.
- For `react-ts` template: keep Sandpack but wrap it with a timeout fallback. If Sandpack fails to connect within 8 seconds, show the iframe srcdoc fallback with a note that the React preview couldn't load.
- Keep all existing toolbar buttons (Copy HTML, Download, Refresh, Fullscreen) -- they already work with `buildCombinedHTML()`.

### Technical details

The `buildCombinedHTML()` function (lines 79-120) already builds a complete standalone HTML document with Tailwind CDN, Inter font, and inlined CSS/JS. The iframe srcdoc approach simply uses this output directly:

```tsx
<iframe
  srcDoc={buildCombinedHTML()}
  className="w-full h-full border-0"
  sandbox="allow-scripts allow-same-origin"
  title="Preview"
/>
```

This eliminates the dependency on CodeSandbox bundler servers for the most common use case (static website generation).

### What stays the same
- Toolbar with Copy/Download/Refresh/Fullscreen buttons
- The "No Code to Preview" empty state
- All file parsing logic
- The `buildCombinedHTML()` function

