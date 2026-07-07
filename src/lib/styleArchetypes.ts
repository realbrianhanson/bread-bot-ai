// Shared style archetype presets consumed by the StylePicker and passed
// through the existing customDesignMd → designMd pipeline into BOTH the
// chat generator and the sandbox app builder. No DB round-trip.
//
// Each archetype's `designMd` is a complete DESIGN.md-shaped block: HSL token
// values (per the design constitution), display+body font pairing, a short
// art-direction note, and a signature-element suggestion. Names are generic
// design DIRECTIONS — no brand names, no trade-dress imitation.

export interface StyleArchetype {
  slug: string;
  name: string;
  category: string;
  swatch: [string, string, string, string]; // hex previews for the picker only
  displayFont: string;
  bodyFont: string;
  signature: string;
  note: string;
  designMd: string;
}

function buildDesignMd(a: Omit<StyleArchetype, 'designMd'> & {
  tokens: string; // interior of :root { ... } — HSL bare triples per constitution
}): string {
  return `# ${a.name}

## Art direction
${a.note}

## Signature element
${a.signature}

## Type
- Display: ${a.displayFont}
- Body: ${a.bodyFont}
- Load via a single Google Fonts <link> in <head>.

## Tokens (HSL — bare triples, consumed as hsl(var(--x)))
\`\`\`css
:root {
${a.tokens}
}
\`\`\`

## Rules
- Rewrite the constitution's token VALUES to the block above; keep every token NAME.
- Display font goes on --font-display, body font on --font-body.
- All color decisions in components come from these tokens; never raw hex.
- Signature element appears once, prominently, above the fold. Everything else stays disciplined.
`;
}

const RAW: Array<Omit<StyleArchetype, 'designMd'> & { tokens: string }> = [
  {
    slug: 'cinematic-dark',
    name: 'Cinematic Dark',
    category: 'Dark',
    swatch: ['#0B0B10', '#F5F5F7', '#7C5CFF', '#1A1A22'],
    displayFont: "'Bricolage Grotesque', 'Inter', sans-serif",
    bodyFont: "'Inter', system-ui, sans-serif",
    signature: 'Full-bleed hero photograph or generated cinematic still with a slow-panning gradient wash over it.',
    note: 'Deep charcoal canvas, oversized imagery, one saturated neon accent used sparingly. Feels like a film opening title, not a SaaS landing page.',
    tokens: `  --font-display: 'Bricolage Grotesque', 'Inter', sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --radius: 8px;
  --background: 240 12% 5%;
  --foreground: 240 15% 96%;
  --muted: 240 10% 12%;
  --muted-foreground: 240 8% 62%;
  --card: 240 12% 8%;
  --card-foreground: 240 15% 96%;
  --primary: 258 100% 68%;
  --primary-foreground: 240 15% 96%;
  --secondary: 240 10% 14%;
  --secondary-foreground: 240 15% 96%;
  --accent: 258 100% 68%;
  --accent-foreground: 240 15% 96%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 240 15% 96%;
  --border: 240 10% 16%;
  --ring: 258 100% 68%;
  --hero-bg: 240 14% 3%;
  --hero-foreground: 240 15% 96%;
  --hero-muted: 240 8% 62%;
  --section-alt: 240 12% 8%;
  --success: 160 84% 45%;
  --success-foreground: 240 15% 96%;`,
  },
  {
    slug: 'editorial-broadsheet',
    name: 'Editorial Broadsheet',
    category: 'Editorial',
    swatch: ['#F8F5EE', '#111111', '#8A1F1F', '#E7E1D3'],
    displayFont: "'Fraunces', 'Playfair Display', Georgia, serif",
    bodyFont: "'Inter', 'Georgia', serif",
    signature: 'Front-page style masthead with a hairline rule under it, a huge serif dropcap opening the first paragraph, and small-caps section labels.',
    note: 'Ink on newsprint. Serif headlines set tight, generous leading in body, hairline rules and a single restrained crimson accent for pull-quotes and links.',
    tokens: `  --font-display: 'Fraunces', 'Playfair Display', Georgia, serif;
  --font-body: 'Inter', 'Georgia', serif;
  --radius: 2px;
  --background: 40 30% 96%;
  --foreground: 0 0% 7%;
  --muted: 40 20% 92%;
  --muted-foreground: 0 0% 34%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 7%;
  --primary: 0 63% 33%;
  --primary-foreground: 40 30% 96%;
  --secondary: 40 20% 90%;
  --secondary-foreground: 0 0% 7%;
  --accent: 0 63% 33%;
  --accent-foreground: 40 30% 96%;
  --destructive: 0 84% 45%;
  --destructive-foreground: 40 30% 96%;
  --border: 40 12% 78%;
  --ring: 0 63% 33%;
  --hero-bg: 0 0% 7%;
  --hero-foreground: 40 30% 96%;
  --hero-muted: 40 10% 72%;
  --section-alt: 40 24% 93%;
  --success: 150 45% 32%;
  --success-foreground: 40 30% 96%;`,
  },
  {
    slug: 'fintech-precision',
    name: 'Fintech Precision',
    category: 'Product',
    swatch: ['#0A2540', '#F6F9FC', '#635BFF', '#00D4B4'],
    displayFont: "'Inter', system-ui, sans-serif",
    bodyFont: "'Inter', system-ui, sans-serif",
    signature: 'Clean data-driven hero: a live-looking numeric card or chart module rendered in tokens, tight grid, precise spacing.',
    note: 'Tight, technical, trustworthy. Cool blue foundation with a green success accent, dense data cards, generous but disciplined whitespace.',
    tokens: `  --font-display: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --radius: 10px;
  --background: 210 40% 98%;
  --foreground: 214 60% 14%;
  --muted: 210 40% 96%;
  --muted-foreground: 214 20% 42%;
  --card: 0 0% 100%;
  --card-foreground: 214 60% 14%;
  --primary: 244 82% 58%;
  --primary-foreground: 0 0% 100%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 214 60% 14%;
  --accent: 168 92% 41%;
  --accent-foreground: 214 60% 10%;
  --destructive: 0 84% 55%;
  --destructive-foreground: 0 0% 100%;
  --border: 214 24% 88%;
  --ring: 244 82% 58%;
  --hero-bg: 214 60% 14%;
  --hero-foreground: 210 40% 98%;
  --hero-muted: 214 20% 72%;
  --section-alt: 210 40% 96%;
  --success: 168 92% 41%;
  --success-foreground: 214 60% 10%;`,
  },
  {
    slug: 'playful-gradient',
    name: 'Playful Gradient',
    category: 'Consumer',
    swatch: ['#FEF6FF', '#7A2FF5', '#FF7AB6', '#FFC15E'],
    displayFont: "'Bricolage Grotesque', 'Inter', sans-serif",
    bodyFont: "'Inter', system-ui, sans-serif",
    signature: 'A soft multi-color radial gradient blob behind the hero headline, rounded 24px cards, playful chip-style CTAs.',
    note: 'Friendly and airy. Soft pinks, violets, and warm yellows blended in gradients. Rounded everything, buoyant motion, never garish.',
    tokens: `  --font-display: 'Bricolage Grotesque', 'Inter', sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --radius: 20px;
  --background: 300 60% 99%;
  --foreground: 270 30% 14%;
  --muted: 300 40% 96%;
  --muted-foreground: 270 12% 46%;
  --card: 0 0% 100%;
  --card-foreground: 270 30% 14%;
  --primary: 268 92% 58%;
  --primary-foreground: 0 0% 100%;
  --secondary: 330 90% 94%;
  --secondary-foreground: 270 30% 14%;
  --accent: 36 100% 62%;
  --accent-foreground: 270 30% 14%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 300 30% 90%;
  --ring: 268 92% 58%;
  --hero-bg: 300 60% 99%;
  --hero-foreground: 270 30% 14%;
  --hero-muted: 270 12% 46%;
  --section-alt: 330 90% 96%;
  --success: 160 76% 40%;
  --success-foreground: 0 0% 100%;`,
  },
  {
    slug: 'warm-minimal',
    name: 'Warm Minimal',
    category: 'Editorial',
    swatch: ['#F6F1E7', '#1B1712', '#C4661F', '#EFE7D5'],
    displayFont: "'Fraunces', Georgia, serif",
    bodyFont: "'Inter', system-ui, sans-serif",
    signature: 'Enormous breathing room around a single serif headline, with one warm terracotta underline sweep on the key word.',
    note: 'Cream background, single warm accent, generous space. Confident restraint — feels handcrafted, never busy.',
    tokens: `  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --radius: 8px;
  --background: 36 40% 94%;
  --foreground: 24 22% 10%;
  --muted: 36 26% 90%;
  --muted-foreground: 24 12% 40%;
  --card: 36 44% 97%;
  --card-foreground: 24 22% 10%;
  --primary: 22 76% 44%;
  --primary-foreground: 36 40% 96%;
  --secondary: 36 26% 88%;
  --secondary-foreground: 24 22% 10%;
  --accent: 22 76% 44%;
  --accent-foreground: 36 40% 96%;
  --destructive: 0 74% 45%;
  --destructive-foreground: 36 40% 96%;
  --border: 36 18% 82%;
  --ring: 22 76% 44%;
  --hero-bg: 36 44% 97%;
  --hero-foreground: 24 22% 10%;
  --hero-muted: 24 12% 40%;
  --section-alt: 36 30% 91%;
  --success: 150 40% 32%;
  --success-foreground: 36 40% 96%;`,
  },
  {
    slug: 'bold-monochrome',
    name: 'Bold Monochrome',
    category: 'Statement',
    swatch: ['#FFFFFF', '#000000', '#000000', '#EAEAEA'],
    displayFont: "'Bricolage Grotesque', 'Inter Tight', sans-serif",
    bodyFont: "'Inter', system-ui, sans-serif",
    signature: 'A giant black wordmark headline that touches the page edges, split across two lines, with a single 1px black rule under it.',
    note: 'Pure black on pure white (or the inverse). Massive display type, stark ruled sections, zero decoration. Everything is a statement.',
    tokens: `  --font-display: 'Bricolage Grotesque', 'Inter Tight', sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --radius: 0px;
  --background: 0 0% 100%;
  --foreground: 0 0% 4%;
  --muted: 0 0% 96%;
  --muted-foreground: 0 0% 32%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 4%;
  --primary: 0 0% 4%;
  --primary-foreground: 0 0% 100%;
  --secondary: 0 0% 94%;
  --secondary-foreground: 0 0% 4%;
  --accent: 0 0% 4%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84% 45%;
  --destructive-foreground: 0 0% 100%;
  --border: 0 0% 84%;
  --ring: 0 0% 4%;
  --hero-bg: 0 0% 4%;
  --hero-foreground: 0 0% 100%;
  --hero-muted: 0 0% 72%;
  --section-alt: 0 0% 96%;
  --success: 0 0% 4%;
  --success-foreground: 0 0% 100%;`,
  },
  {
    slug: 'luxury-serif',
    name: 'Luxury Serif',
    category: 'Luxury',
    swatch: ['#0E0C08', '#EFE6D0', '#C9A15B', '#1C1810'],
    displayFont: "'Playfair Display', 'Fraunces', serif",
    bodyFont: "'Inter', system-ui, sans-serif",
    signature: 'Thin gold hairline framing the hero, italic serif headline sitting on a warm-black backdrop with a soft vignette.',
    note: 'Dark warm-black backdrop, muted champagne foreground, restrained metallic gold accent. Elegant, quiet, expensive.',
    tokens: `  --font-display: 'Playfair Display', 'Fraunces', serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --radius: 4px;
  --background: 36 20% 6%;
  --foreground: 42 40% 90%;
  --muted: 36 14% 12%;
  --muted-foreground: 42 14% 66%;
  --card: 36 18% 9%;
  --card-foreground: 42 40% 90%;
  --primary: 40 55% 58%;
  --primary-foreground: 36 20% 6%;
  --secondary: 36 14% 14%;
  --secondary-foreground: 42 40% 90%;
  --accent: 40 55% 58%;
  --accent-foreground: 36 20% 6%;
  --destructive: 0 68% 48%;
  --destructive-foreground: 42 40% 90%;
  --border: 36 14% 18%;
  --ring: 40 55% 58%;
  --hero-bg: 36 22% 4%;
  --hero-foreground: 42 40% 90%;
  --hero-muted: 42 14% 66%;
  --section-alt: 36 18% 9%;
  --success: 150 30% 45%;
  --success-foreground: 42 40% 90%;`,
  },
  {
    slug: 'terminal-mono',
    name: 'Terminal Mono',
    category: 'Technical',
    swatch: ['#0A0F0A', '#B7FFB7', '#43FF64', '#0F1A0F'],
    displayFont: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
    bodyFont: "'JetBrains Mono', ui-monospace, monospace",
    signature: 'A live-looking terminal block above the fold with a blinking caret, ASCII rules, and a prompt string as the hero H1.',
    note: 'Monospaced everywhere. Deep near-black canvas with phosphor-green accents and dashed ASCII-style separators. Code-forward and confident.',
    tokens: `  --font-display: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  --font-body: 'JetBrains Mono', ui-monospace, monospace;
  --radius: 4px;
  --background: 130 20% 5%;
  --foreground: 130 60% 82%;
  --muted: 130 18% 10%;
  --muted-foreground: 130 20% 60%;
  --card: 130 20% 7%;
  --card-foreground: 130 60% 82%;
  --primary: 132 90% 55%;
  --primary-foreground: 130 20% 5%;
  --secondary: 130 18% 12%;
  --secondary-foreground: 130 60% 82%;
  --accent: 132 90% 55%;
  --accent-foreground: 130 20% 5%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 130 60% 92%;
  --border: 130 20% 16%;
  --ring: 132 90% 55%;
  --hero-bg: 130 22% 4%;
  --hero-foreground: 132 90% 78%;
  --hero-muted: 130 20% 55%;
  --section-alt: 130 20% 7%;
  --success: 132 90% 55%;
  --success-foreground: 130 20% 5%;`,
  },
  {
    slug: 'soft-pastel',
    name: 'Soft Pastel',
    category: 'Consumer',
    swatch: ['#F4F7FB', '#2B3346', '#B5D3F0', '#F6D0D9'],
    displayFont: "'Bricolage Grotesque', 'Inter', sans-serif",
    bodyFont: "'Inter', system-ui, sans-serif",
    signature: 'A soft dual-tone pastel wash spanning the hero, with rounded illustrated shapes floating gently at the edges.',
    note: 'Airy sky-blue and blush pastels on a near-white base. Rounded corners, gentle shadows, calm rhythm. Approachable and quiet.',
    tokens: `  --font-display: 'Bricolage Grotesque', 'Inter', sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --radius: 18px;
  --background: 212 40% 97%;
  --foreground: 222 30% 20%;
  --muted: 212 30% 94%;
  --muted-foreground: 222 12% 46%;
  --card: 0 0% 100%;
  --card-foreground: 222 30% 20%;
  --primary: 212 66% 56%;
  --primary-foreground: 0 0% 100%;
  --secondary: 348 78% 90%;
  --secondary-foreground: 222 30% 20%;
  --accent: 348 78% 78%;
  --accent-foreground: 222 30% 20%;
  --destructive: 0 76% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 212 30% 88%;
  --ring: 212 66% 56%;
  --hero-bg: 212 60% 92%;
  --hero-foreground: 222 30% 20%;
  --hero-muted: 222 12% 46%;
  --section-alt: 348 60% 96%;
  --success: 160 60% 42%;
  --success-foreground: 0 0% 100%;`,
  },
  {
    slug: 'brutalist',
    name: 'Brutalist',
    category: 'Statement',
    swatch: ['#F2ED1F', '#0A0A0A', '#FF3B00', '#FFFFFF'],
    displayFont: "'Space Grotesk', 'Bricolage Grotesque', sans-serif",
    bodyFont: "'IBM Plex Mono', 'JetBrains Mono', monospace",
    signature: 'Oversized off-grid headline with a raw solid-color panel bleeding to the edge, thick 3px black borders, and a bright warning-color CTA.',
    note: 'Raw, high-contrast, deliberately unpolished. Loud yellow or concrete-gray canvas with heavy black borders, sharp corners, oversized type.',
    tokens: `  --font-display: 'Space Grotesk', 'Bricolage Grotesque', sans-serif;
  --font-body: 'IBM Plex Mono', 'JetBrains Mono', monospace;
  --radius: 0px;
  --background: 58 88% 54%;
  --foreground: 0 0% 4%;
  --muted: 58 40% 82%;
  --muted-foreground: 0 0% 20%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 4%;
  --primary: 0 0% 4%;
  --primary-foreground: 58 88% 54%;
  --secondary: 0 0% 100%;
  --secondary-foreground: 0 0% 4%;
  --accent: 14 100% 50%;
  --accent-foreground: 0 0% 100%;
  --destructive: 14 100% 50%;
  --destructive-foreground: 0 0% 100%;
  --border: 0 0% 4%;
  --ring: 14 100% 50%;
  --hero-bg: 58 88% 54%;
  --hero-foreground: 0 0% 4%;
  --hero-muted: 0 0% 20%;
  --section-alt: 0 0% 100%;
  --success: 132 70% 34%;
  --success-foreground: 0 0% 100%;`,
  },
];

export const STYLE_ARCHETYPES: StyleArchetype[] = RAW.map((a) => ({
  slug: a.slug,
  name: a.name,
  category: a.category,
  swatch: a.swatch,
  displayFont: a.displayFont,
  bodyFont: a.bodyFont,
  signature: a.signature,
  note: a.note,
  designMd: buildDesignMd(a),
}));

export function findArchetype(slug: string): StyleArchetype | undefined {
  return STYLE_ARCHETYPES.find((a) => a.slug === slug);
}