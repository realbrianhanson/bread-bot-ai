// Single shared design constitution used by BOTH generation surfaces:
//  - supabase/functions/chat/index.ts   (single-file website generator)
//  - supabase/functions/sandbox-manager/index.ts (multi-file React app builder)
//
// If you change a rule here, both surfaces immediately pick it up.

// Default HSL token skeleton. Values here are placeholders — the model MUST
// rewrite them per project via the art-direction ritual below. Never ship the
// generic AI palettes (indigo/violet SaaS gradient, cream+serif+terracotta,
// near-black + acid green).
//
// FOOTGUN: token VALUES are stored bare, without hsl() around them, so they
// are consumed as `hsl(var(--primary))`. Putting `rgb(...)` inside `hsl(...)`
// silently produces the wrong color — do not do it.
export const TOKEN_TEMPLATE_HSL = `:root {
  --font-display: 'Space Grotesk', 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
  --radius: 12px;

  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  --primary: 244 75% 57%;
  --primary-foreground: 0 0% 100%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222 47% 11%;
  --accent: 38 92% 50%;
  --accent-foreground: 222 47% 11%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 214 32% 91%;
  --ring: 244 75% 57%;
  --hero-bg: 222 47% 11%;
  --hero-foreground: 210 40% 98%;
  --hero-muted: 215 20% 65%;
  --section-alt: 210 40% 98%;
  --success: 160 84% 39%;
  --success-foreground: 0 0% 100%;
}`;

export const DESIGN_CONSTITUTION = `DESIGN CONSTITUTION (non-negotiable — applies to every page and every component you ship)

1. ART DIRECTION FIRST — every single time.
Before you write any markup, output a 3-line design plan (as a CSS comment when you can, or as a short note in prose otherwise):
  Line 1 — what the brand evokes (mood, subject matter, materials, vernacular).
  Line 2 — chosen palette (name the colors, not just "blue"), display + body fonts, radius.
  Line 3 — one signature visual element that gives THIS page its identity.
You may NOT ship the default template palette. Explicitly avoid the three generic AI looks unless the brief asks for them by name:
  - Indigo/violet SaaS gradient on white with Inter everywhere.
  - Cream background + serif + terracotta accent.
  - Near-black + one acid-green accent with hairline rules.
Make choices specific to THIS brief.

2. TOKENS ONLY — no raw palette values in components.
All color, spacing, radius and typography come from CSS variables defined in a single token block. Rewrite the token VALUES per project as part of the art direction step; keep the token NAMES.
Banned in component markup:
  - Raw Tailwind palette classes: text-gray-400, bg-blue-600, text-white, bg-slate-900, border-zinc-200, etc.
  - Raw hex, rgb(), or named CSS colors: #A78BFA, rgb(255,0,0), color: white, background: lavender.
Allowed:
  - Semantic Tailwind classes mapped to tokens: bg-background, text-foreground, bg-primary, text-primary-foreground, bg-muted, text-muted-foreground, bg-card, border-border, bg-hero, text-hero-foreground, bg-accent, etc.
  - Arbitrary token references: bg-[hsl(var(--primary))], text-[hsl(var(--foreground))], border-[hsl(var(--border))].
  - Inline style="color: hsl(var(--foreground))" when a class is impractical.

3. HSL VALUES ONLY inside token definitions.
Token values are stored as bare HSL triples like "244 75% 57%" and consumed as hsl(var(--primary)) / hsl(var(--primary) / 0.5). Hex and rgb in a token definition break opacity utilities silently.
FOOTGUN: writing rgb(...) inside hsl(...) yields the wrong color with no error. Never mix syntaxes.

4. TOKEN BLOCK — copy this skeleton and rewrite the values (do not ship the placeholder palette):
${TOKEN_TEMPLATE_HSL}

5. Component variants over inline style overrides.
When a color/size/state changes in one spot, add a variant (Tailwind class, cva variant, or component prop). Do not sprinkle inline styles to override the token system.

6. Typography scale.
  - Display font (font-display) for h1/h2 at large sizes with tracking-tight and leading tight (1.05 to 1.15).
  - Body font (font-sans) for body copy: text-base to text-lg, leading-relaxed.
  - Clear size gap between levels (e.g. h1 5xl-7xl, h2 3xl-4xl, h3 xl-2xl, body base-lg).
  - Use 2 typefaces max unless the brief asks otherwise.

7. Spacing floor and structure.
  - Section vertical padding py-20 to py-32 desktop, py-14 to py-20 mobile.
  - Container max-w 1100-1280px, centered, px-6 on mobile.
  - Card padding 24-40px, radii from the --radius token.
  - Focus states VISIBLE (ring or outline in var(--ring)) on every interactive element.
  - Hover transitions on every button/link (transition-colors or transition-all duration-200).

8. Backgrounds and depth.
  - Backgrounds carry mood: layered gradients from tokens, subtle radial glows, alternating section tints. Not flat white everywhere.
  - Contrast is high always. Never light text on light backgrounds. Every text block must resolve to a --*-foreground token that is legible on its background.
  - Signature element takes the bold move; the rest stays quiet and disciplined.

9. SEO DEFAULTS on every generated page.
  - <title> under 60 chars, keyword-forward, specific.
  - <meta name="description"> under 160 chars.
  - Exactly ONE <h1> per page.
  - Semantic HTML5: <header>, <nav>, <main>, <section>, <article>, <footer>.
  - <img alt="..."> on every image, describing the content.
  - <meta name="viewport" content="width=device-width, initial-scale=1.0" /> in <head>.
  - Open Graph: <meta property="og:title">, <meta property="og:description">, <meta property="og:type" content="website" />.
  - <meta name="twitter:card" content="summary_large_image" />.
  - JSON-LD only when there's a real entity to describe (Organization, Product, Article) — do not fabricate.

10. IMAGE STRATEGY.
  - Hero images, feature banners, and any large visual: prefer generating a real image via the request-image capability so it fits the art direction, then use the returned URL directly in <img src>. If image generation is unavailable, fall back to https://picsum.photos/seed/<descriptive-seed>/1600/900 (deterministic per seed).
  - Icons: inline SVGs or emoji, never a raster.
  - NEVER use placehold.co for visual imagery — it looks unfinished.
  - The GHL Custom-Code funnel mode is the ONE exception: dashed-border placeholder <div> blocks are allowed there for form/calendar embed slots (they are functional placeholders, not visual content).

11. Direct-response quality floor.
  - Benefit-driven headlines with specific numbers where honest ("Ship in 90 days", not "Ship faster").
  - One primary CTA per screen, action verb, reassurance micro-copy under it.
  - Social proof near the CTA. Testimonials with realistic names and titles, not lorem ipsum.
  - Mobile responsive at sm/md/lg breakpoints, min 44px tap targets, min 16px font on mobile.

12. If any rule above conflicts with the user's explicit brief, the user wins for that project — but call it out in the design plan.`;

// Legacy default hex palette (kept for the anthropic-proxy hex fallback path).
// New code should use TOKEN_TEMPLATE_HSL above and the constitution.
export const LEGACY_HEX_TOKENS = `:root {
  --background: #FFFFFF;
  --foreground: #0F172A;
  --muted: #F1F5F9;
  --muted-foreground: #64748B;
  --card: #FFFFFF;
  --card-foreground: #0F172A;
  --primary: #4F46E5;
  --primary-foreground: #FFFFFF;
  --secondary: #F1F5F9;
  --secondary-foreground: #0F172A;
  --accent: #F59E0B;
  --accent-foreground: #0F172A;
  --destructive: #EF4444;
  --destructive-foreground: #FFFFFF;
  --border: #E2E8F0;
  --ring: #4F46E5;
  --hero-bg: #0F172A;
  --hero-foreground: #F8FAFC;
  --hero-muted: #94A3B8;
  --section-alt: #F8FAFC;
  --success: #10B981;
  --success-foreground: #FFFFFF;
}`;