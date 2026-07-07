---
name: Brand identity — toasted amber
description: Warm garlic-gold primary on warm charcoal (never pure black), teal accent, Bricolage Grotesque display + Inter body
type: design
---
Primary: garlic-amber (light 32 92% 48%, dark 36 96% 58%). Background: warm cream / warm charcoal — never pure black or cool indigo.
Accent: sage-teal (175/172 hue). Gradients layer amber→warm-orange→rose. Shadows tinted warm brown, glow tinted from primary.
Display font: Bricolage Grotesque (font-display / .font-display class) for headlines with tracking-tight. Body: Inter. Mono: JetBrains Mono.
Radius bumped to 0.875rem. Focus ring uses --ring token globally via :focus-visible.
All tokens live in src/index.css; do not reintroduce indigo/violet defaults.