

## Plan: New Landing Page with GHL Embed Form

### What we'll build
A new public landing page at `/lead` (or `/signup` — your call) that features the GarlicBread.ai branding, a compelling headline section, and the GHL embedded form for lead capture. The page will match the existing visual style (aurora background, dark theme, same typography).

### Technical approach

**1. Create `src/pages/LeadCapture.tsx`**
- Reuse the existing visual components: `AuroraBackground`, `ThemeToggle`, branding
- Left side (on desktop): headline, value props, social proof — similar to the auth page layout
- Right side (or centered on mobile): the GHL form embed
- The GHL iframe will be rendered directly in JSX. The external script (`form_embed.js`) will be loaded via a `useEffect` that appends a `<script>` tag to the document head on mount and cleans it up on unmount.

**2. Add route in `src/App.tsx`**
- Add `<Route path="/lead" element={<PageWrapper><LeadCapture /></PageWrapper>} />`
- Import the new page component
- This is a public route (no `ProtectedRoute` wrapper)

**3. GHL script loading**
Since the GHL embed requires an external script, we'll load it dynamically:
```tsx
useEffect(() => {
  const script = document.createElement('script');
  script.src = 'https://api.aiforbusiness.com/js/form_embed.js';
  script.async = true;
  document.head.appendChild(script);
  return () => { document.head.removeChild(script); };
}, []);
```

The iframe itself will be placed inside a container div with all the `data-*` attributes preserved exactly as provided.

No database or backend changes needed.

