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

12. MOTION AND LIFE — every generated page should feel alive without feeling noisy.
  - Entrance animations: on scroll, fade + slide-up (10–24px) reveal for sections, cards, list items. Stagger children by 60–100ms.
  - Hover micro-interactions on cards and buttons: subtle lift (translateY -2px), border/glow change, or gentle scale (1.02–1.03). 200ms.
  - Smooth scrolling on anchor navigation (html { scroll-behavior: smooth }) and honor scroll-padding for sticky nav.
  - The hero must have one subtle continuous movement — a slow gradient shift, a floating signature element, or a light parallax on scroll.
  - Durations 200–400ms, easing cubic-bezier(0.22, 1, 0.36, 1) (ease-out-expo-ish). Never block content — animations run in parallel to interaction and are non-essential to reading the page.
  - Respect prefers-reduced-motion: ALL animations gated behind @media (prefers-reduced-motion: no-preference) or a JS check. When reduced-motion is set, elements appear in their final state immediately with no transform.
  - For React apps: use framer-motion (motion.div with initial/whileInView/transition) and wrap under a MotionConfig where possible.
  - For plain-HTML pages: use the IntersectionObserver reveal pattern below verbatim.

PLAIN-HTML REVEAL SNIPPET — copy into every generated single-file page (drop <script> in <body>, style block in <head>):
\`\`\`html
<style>
  .reveal { opacity: 0; transform: translateY(16px); transition: opacity 380ms cubic-bezier(0.22, 1, 0.36, 1), transform 380ms cubic-bezier(0.22, 1, 0.36, 1); will-change: opacity, transform; }
  .reveal.is-visible { opacity: 1; transform: none; }
  @media (prefers-reduced-motion: reduce) {
    .reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
  }
  html { scroll-behavior: smooth; }
</style>
<script>
  (function () {
    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var els = document.querySelectorAll('.reveal');
    if (prefersReduced || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e, i) {
        if (e.isIntersecting) {
          setTimeout(function () { e.target.classList.add('is-visible'); }, (i % 6) * 60);
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  })();
</script>
\`\`\`
Apply class="reveal" to sections, cards, feature rows, and any element that should animate in as it enters the viewport. Do NOT apply it to the hero headline itself — the hero should be visible immediately.

13. SECTION LIBRARY — compose good marketing pages from these building blocks.
A serious marketing page usually uses 6–10 of these in sequence. Do NOT ship a thin one-section page unless the user explicitly asked for a minimal single-purpose page. Match the user's brief — a landing page should not be padded with sections it doesn't need, but a "build me a homepage for X" request should include most of these:
  a. Sticky nav: transparent at top, gains a solid background + shadow after scroll (add .scrolled class via a tiny scroll listener). Include logo left, 3–5 nav links, one primary CTA right.
  b. Hero: H1 (the brand promise, benefit-first, 6–12 words), one supporting subhead, primary CTA + secondary CTA, and the signature visual element from the art direction step. Include one subtle motion (gradient shift or floating element).
  c. Trust strip: "Trusted by" band with 4–6 partner/customer logos (SVG or muted grayscale). If real logos aren't provided, use tasteful placeholder wordmarks — do not fabricate specific company names as customers.
  d. Feature grid: 3 or 6 cards with a token-colored icon, title, and 1–2 sentence description. Uniform card heights.
  e. Alternating feature rows: 2–4 rows, image/screenshot on one side, benefit copy and a bullet list on the other, alternating sides.
  f. Stats band: 3–4 large numbers with short labels. Only include if the user provides real numbers — otherwise skip. Never fabricate metrics.
  g. Testimonials: 2–3 quote cards with a realistic name, title, and company. Avatar circle with initials. Use placeholder testimonials only when the brief is generic; call them out as sample copy in a comment.
  h. Pricing table: 2–3 tiers, feature checklists, one tier highlighted with a ring and "Most popular" badge. Only if the brief implies pricing.
  i. FAQ accordion: 4–6 questions, native <details><summary> for plain HTML, with a smooth expand transition. Answers 1–3 sentences.
  j. Final CTA band: full-width dark band (or bold accent band) with a single H2 and a large primary CTA. Reassurance micro-copy under the CTA.
  k. Rich footer: 3–4 columns (Product, Company, Resources, Legal), small logo + tagline, socials, copyright line. Not just a single copyright line.
Rules for composition:
  - Respect the less-is-more principle: a simple ask ("make me a coming-soon page") uses a hero + CTA + footer only.
  - A "landing page" or "homepage" ask uses at least nav + hero + trust strip + features + testimonials or FAQ + final CTA + footer.
  - Every section (except the hero) gets class="reveal".

14. If any rule above conflicts with the user's explicit brief, the user wins for that project — but call it out in the design plan.`;

/**
 * FORMS section — injected into runner/chat prompts alongside the constitution.
 * The caller substitutes {{FORM_ENDPOINT}} and {{FORM_KEY}} at generation/publish time.
 */
export const FORMS_INSTRUCTIONS = `FORMS — every form must actually submit for real.

Endpoint (POST, JSON): {{FORM_ENDPOINT}}
This site's form_key: "{{FORM_KEY}}"

Every <form> you ship MUST:
1. Include a hidden honeypot input, EXACTLY:
   <input type="text" name="_gb_hp" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px;opacity:0;pointer-events:none" aria-hidden="true" />
2. Submit via fetch (never a raw form POST). Serialize named fields into an object, include the form_key, and POST to the endpoint above:
   fetch("{{FORM_ENDPOINT}}", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       form_key: "{{FORM_KEY}}",
       form_name: "<name of this form — e.g. 'contact', 'waitlist'>",
       fields: { /* field_name: value */ },
       _gb_hp: hp,
     }),
   })
3. Disable the submit button and show a "Sending…" state while the request is in flight.
4. On success (r.ok), replace the form UI with an inline success message that uses the site's own token colors — default text: "Thanks, we got it." Do not redirect and do not use alert().
5. On failure, show an inline error using --destructive tokens with the message "Something went wrong. Please try again." Re-enable the button.
6. NEVER fake a submission (no fake success timers, no console.logs pretending to submit). NEVER submit to a placeholder URL. NEVER change the endpoint or the form_key.
7. Client-side validate required fields and email format before POSTing, but always let the server be the source of truth.`;

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