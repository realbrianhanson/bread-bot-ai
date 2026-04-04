

## Plan: Overhaul Chat Edge Function System Prompt & Model Settings

### Changes to `supabase/functions/chat/index.ts`

Three targeted edits — everything else stays identical:

**1. Replace `systemPrompt` (lines 101-133)**
Swap the existing prompt with the comprehensive design system prompt you provided, covering typography (Inter font), spacing, colors, layout, components, animations, and code output rules including Tailwind CDN and Google Fonts. Browser automation section is simplified.

**2. Update `max_tokens` (line 144)**
Change from `8192` to `32000` to prevent large website generations from being truncated.

**3. Update `model` (line 143)**
Change from `'claude-sonnet-4-20250514'` to `'claude-sonnet-4-6'`.

No other files are modified. Auth, usage tracking, streaming, CORS, and API key logic remain untouched.

