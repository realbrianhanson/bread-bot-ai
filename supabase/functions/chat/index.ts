import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";
import { ANTHROPIC_API_URL, HONCHO_API_URL, MODELS, fetchWithTimeout, TIMEOUT_AI_MS, TIMEOUT_DEFAULT_MS, isAbortError } from "../_shared/config.ts";
import { decryptSecret } from "../_shared/crypto.ts";
import { DESIGN_CONSTITUTION, TOKEN_TEMPLATE_HSL, FORMS_INSTRUCTIONS } from "../_shared/design-constitution.ts";
import { routeChatModel } from "../_shared/routeModel.ts";

const FORM_ENDPOINT_URL = `${Deno.env.get('SUPABASE_URL') ?? ''}/functions/v1/submit-form`;
// At chat/generation time the site's form_key is not yet known — the runner
// leaves the placeholder __GB_FORM_KEY__ in the emitted HTML. usePublish.ts
// swaps it for the real form_key when the page is published.
const FORMS_FOR_CHAT = FORMS_INSTRUCTIONS
  .replaceAll('{{FORM_ENDPOINT}}', FORM_ENDPOINT_URL)
  .replaceAll('{{FORM_KEY}}', '__GB_FORM_KEY__');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const HONCHO_API_BASE = HONCHO_API_URL;

async function getHonchoContext(userId: string): Promise<string> {
  const apiKey = Deno.env.get('HONCHO_API_KEY');
  const workspaceId = Deno.env.get('HONCHO_WORKSPACE_ID');
  if (!apiKey || !workspaceId) return '';

  const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

  try {
    await fetchWithTimeout(`${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/${userId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ configuration: { observe_me: true } }),
    }, TIMEOUT_DEFAULT_MS);

    await fetchWithTimeout(`${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/assistant`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ configuration: { observe_me: false } }),
    }, TIMEOUT_DEFAULT_MS);

    const sessionRes = await fetchWithTimeout(`${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/${userId}/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ metadata: { source: 'chat' } }),
    }, TIMEOUT_DEFAULT_MS);
    const session = await sessionRes.json();

    const contextRes = await fetchWithTimeout(
      `${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/${userId}/sessions/${session.id}/context`,
      { method: 'POST', headers, body: JSON.stringify({ max_tokens: 2000 }) }, TIMEOUT_DEFAULT_MS,
    );
    const contextData = await contextRes.json();
    return contextData?.context || contextData?.content || '';
  } catch (err) {
    console.error('[CHAT] Honcho context error:', err);
    return '';
  }
}

async function storeHonchoMessages(userId: string, userMessage: string, assistantMessage: string): Promise<void> {
  const apiKey = Deno.env.get('HONCHO_API_KEY');
  const workspaceId = Deno.env.get('HONCHO_WORKSPACE_ID');
  if (!apiKey || !workspaceId) return;

  const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

  try {
    const sessionRes = await fetchWithTimeout(`${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/${userId}/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ metadata: { source: 'chat_store' } }),
    }, TIMEOUT_DEFAULT_MS);
    const session = await sessionRes.json();

    await fetchWithTimeout(`${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/${userId}/sessions/${session.id}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify([
        { peer_id: userId, content: userMessage },
        { peer_id: 'assistant', content: assistantMessage },
      ]),
    }, TIMEOUT_DEFAULT_MS);
  } catch (err) {
    console.error('[CHAT] Honcho store error:', err);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header provided' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User authenticated:', user.id);

    // Check user's tier and usage limits
    const { data: usageData } = await supabaseClient.rpc('get_user_tier_and_usage', {
      p_user_id: user.id
    });

    const usage = usageData?.[0];
    if (!usage) {
      return new Response(JSON.stringify({ error: 'Unable to fetch usage data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (usage.chat_messages_used >= usage.chat_messages_limit) {
      return new Response(JSON.stringify({ 
        error: 'quota_exceeded',
        message: `You've reached your monthly limit of ${usage.chat_messages_limit} messages. Please upgrade your plan to continue.`,
        limit_exceeded: true 
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine which API key to use
    let anthropicApiKey: string;
    
    if (usage.can_use_own_keys) {
      const { data: apiKeyData } = await supabaseClient
        .from('api_keys')
        .select('encrypted_key')
        .eq('user_id', user.id)
        .eq('provider', 'anthropic')
        .eq('is_active', true)
        .maybeSingle();

      if (apiKeyData?.encrypted_key) {
        try {
          anthropicApiKey = await decryptSecret(apiKeyData.encrypted_key);
          console.log("Using user's own Anthropic API key");
        } catch (e) {
          console.warn('Failed to decrypt user Anthropic key, falling back:', e);
          anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
        }
      } else {
        anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
        console.log('Using shared Anthropic API key (user has BYOK but no key configured)');
      }
    } else {
      anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
      console.log('Using shared Anthropic API key');
    }

    if (!anthropicApiKey) {
      return new Response(JSON.stringify({ error: 'Anthropic API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, ghlMode, designMd: clientDesignMd, marketingMd, conversationCategory } = await req.json();

    console.log('Calling Anthropic API with', messages.length, 'messages, ghlMode:', !!ghlMode, 'hasDesignMd:', !!clientDesignMd, 'hasMarketingMd:', !!marketingMd);

    const TOKEN_SKELETON = TOKEN_TEMPLATE_HSL;

    const COLOR_RULES = `COLOR USAGE RULES (ABSOLUTE):
- Rewrite the token VALUES in the :root block for THIS project (from the art direction step). Keep the token NAMES exactly as listed.
- Consume tokens as hsl(var(--token)) — e.g. background: hsl(var(--primary)); color: hsl(var(--foreground) / 0.7).
- Body/paragraph text: hsl(var(--foreground)). Muted text: hsl(var(--muted-foreground)).
- Cards: background hsl(var(--card)), text hsl(var(--card-foreground)).
- Buttons primary: background hsl(var(--primary)), text hsl(var(--primary-foreground)).
- Hero/dark sections: background hsl(var(--hero-bg)), text hsl(var(--hero-foreground)), muted hsl(var(--hero-muted)).
- Alternating sections: hsl(var(--section-alt)) background with hsl(var(--foreground)) text.
- Borders: hsl(var(--border)). Links and accents: hsl(var(--primary)).
- Never light text on light backgrounds. Every text block must use a --*-foreground token that is legible on its background.
- No raw Tailwind palette classes (no text-white, text-gray-400, bg-blue-600, bg-slate-900, etc.) in markup.
- No raw hex, rgb(), or named CSS colors inside components. Only hsl(var(--token)).
- FOOTGUN: never put rgb(...) inside hsl(...) — it silently produces the wrong color.`;

    const HERO_PATTERNS = `HERO SECTION PATTERNS (pick or invent one per page — do not default to the same pattern every time):
Pattern A — Dark hero: bg hsl(var(--hero-bg)), heading hsl(var(--hero-foreground)), subtitle hsl(var(--hero-muted)), CTA bg hsl(var(--accent)) text hsl(var(--accent-foreground)).
Pattern B — Light hero with accent: bg hsl(var(--background)), heading hsl(var(--foreground)), subtitle hsl(var(--muted-foreground)), CTA hsl(var(--primary)) / hsl(var(--primary-foreground)).
Pattern C — Gradient hero: layered gradient between hero tokens, high-contrast text.
Pattern D — Editorial split: type-driven left column + signature visual right column.
NEVER: light/pastel gradient with light text. Match text foreground to background luminance.`;

    const ghlSystemPrompt = `You are an elite direct-response landing page designer who specializes in GoHighLevel (GHL) funnel pages. You create high-converting, visually stunning landing pages that work PERFECTLY inside GHL's Custom Code element.

${DESIGN_CONSTITUTION}

${FORMS_FOR_CHAT}

Every page MUST include a :root token block inside the scoped wrapper's <style> tag using the skeleton below. REWRITE the values for this specific project per the art-direction ritual; do not ship the placeholder palette.

${TOKEN_SKELETON}

${COLOR_RULES}

CRITICAL GHL TECHNICAL RULES:
- ALL CSS must be inside a single <style> tag with a unique wrapper class (e.g., .ghl-custom-xyz) to prevent conflicts with GHL's own CSS
- NEVER use Tailwind CDN or any external CSS framework — GHL may strip external script/link tags
- NEVER use external font CDN links — use system font stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- ALL code must be in a SINGLE code block — one self-contained HTML blob with embedded <style> and <script> tags
- Wrap EVERYTHING in a single container div with a unique class like <div class="ghl-lander-[random4chars]"> to scope all styles
- Form and calendar embed slots use dashed-border placeholder divs (see below). For actual visual imagery use https://picsum.photos/seed/<descriptive-seed>/1600/900. Never use placehold.co for visual imagery.
- Do NOT use position: fixed or position: sticky — GHL's builder can break these
- Maximum width should be 100% — GHL handles the page container
- The code must be mobile-responsive using CSS media queries (not Tailwind breakpoints)

BODY STYLES (set on the wrapper class):
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
color: hsl(var(--foreground));
background: hsl(var(--background));
-webkit-font-smoothing: antialiased;

DIRECT RESPONSE DESIGN SYSTEM:

Hero Section:
- Bold, benefit-driven headline (40-56px desktop, 28-36px mobile)
- Subheadline addressing the target audience's pain point (18-22px)
- Clear CTA button above the fold (large, high-contrast, rounded, action verb)
- Background: var(--hero-bg), text: var(--hero-foreground), subtitle: var(--hero-muted)
- CTA: background var(--accent), text var(--accent-foreground)
- Minimum height: 80vh on desktop

Social Proof Section:
- Testimonials with names, titles, photos (or placeholders)
- Star ratings, statistics in large bold text
- Background: var(--section-alt), text: var(--foreground)

Features/Benefits Section:
- 3 or 6 card grid layout
- Cards: background var(--card), text var(--card-foreground), border var(--border)
- Benefit language ("Save 10 hours/week" not "Automation tool")

FAQ Section:
- Accordion-style (pure CSS, no JS framework needed)
- Background: var(--background), text: var(--foreground)

Final CTA Section:
- Background: var(--hero-bg), text: var(--hero-foreground)
- Urgency/scarcity element, repeat CTA button, risk reversal statement

${HERO_PATTERNS}

TYPOGRAPHY:
- Headlines: font-weight 800, letter-spacing -0.02em
- Body: 16-18px, line-height 1.7, font-weight 400
- CTAs: font-weight 700, text-transform uppercase, letter-spacing 0.05em

SPACING:
- Sections: 80-120px vertical padding
- Content max-width: 1100px, centered
- Card padding: 32-40px
- Button padding: 16px 40px minimum

ANIMATIONS (CSS only):
- Buttons: subtle scale(1.02) on hover + shadow increase
- Cards: subtle translateY(-4px) on hover
- CSS transitions (0.2-0.3s ease)
- No scroll animations — they break in GHL preview

FORM INTEGRATION:
<div style="background: rgba(0,0,0,0.05); border: 2px dashed var(--border); border-radius: 12px; padding: 40px; text-align: center; margin: 24px 0;">
  <p style="color: var(--muted-foreground); font-size: 16px; margin: 0;">
    📋 Paste your GHL Form embed code here<br>
    <small>Go to Sites → Forms → Select Form → Embed → Copy Code</small>
  </p>
</div>

CALENDAR INTEGRATION:
<div style="background: rgba(0,0,0,0.05); border: 2px dashed var(--border); border-radius: 12px; padding: 40px; text-align: center; margin: 24px 0;">
  <p style="color: var(--muted-foreground); font-size: 16px; margin: 0;">
    📅 Paste your GHL Calendar embed code here<br>
    <small>Go to Calendars → Settings → Share → Embed Code → Copy</small>
  </p>
</div>

OUTPUT FORMAT:
Always output ONE single code block containing the complete, self-contained HTML with embedded <style> and <script>.
Start with: <!-- GHL Custom Code Block — Paste into a Custom Code element -->
ALL color references must use hsl(var(--token-name)) syntax. No raw colors anywhere.

USER-UPLOADED IMAGES:
When the user uploads images, use the provided URLs in <img> tags. Do NOT use placeholder URLs when real images are provided.

BROWSER AUTOMATION:
This app has browser automation. For browsing tasks, tell users: /browse [task description]

CONVERSION OPTIMIZATION RULES (MANDATORY FOR ALL PAGES):

1. STICKY NAVIGATION: Every page MUST include a navigation bar at the top with a CTA button visible as the user scrolls. Use position: relative with a solid background (GHL breaks fixed/sticky). On standalone pages outside GHL, position: sticky is acceptable.

2. HERO SECTION — AIDA FRAMEWORK:
   - Attention: Bold headline with a SPECIFIC benefit. E.g., "Grow Your Revenue 3x in 90 Days" not "Welcome to Our Website"
   - Interest: 2-line subheadline addressing the target audience's specific pain point
   - Desire: Social proof stat or trust badge immediately visible ("Trusted by 2,500+ businesses" or a star rating)
   - Action: Single high-contrast CTA button with an action verb like "Get Started Free", "Book Your Call", "Claim Your Spot"

3. URGENCY ELEMENTS: Include where appropriate:
   - "Limited spots available" or "Only X seats remaining" badges
   - "Join 2,500+ businesses" social proof counters
   - Time-sensitive language ("Start your free trial today", "This week only")
   - CSS-only countdown timer placeholders where relevant

4. CTA MICRO-COPY: Every CTA button MUST have small reassurance text directly below it:
   - "No credit card required" / "Cancel anytime" / "Free 14-day trial" / "100% money-back guarantee"
   - Style: font-size 12-13px, color var(--muted-foreground), margin-top 8px

5. TESTIMONIAL SECTIONS MUST include:
   - Real-looking names and job titles ("Sarah Chen, Marketing Director at TechCorp")
   - Photo placeholders using gradient circles with initials (CSS-only, no external images)
   - SPECIFIC results with numbers: "Grew revenue 340% in 6 months", "Saved 15 hours per week"
   - Star ratings displayed prominently

6. PRICING SECTIONS MUST have:
   - A "Most Popular" tier highlighted with a different background (var(--primary) bg or a subtle border/ring)
   - A "Best Value" badge on the annual/highest tier
   - Clear feature comparison with checkmarks and X marks
   - Monthly/annual toggle where applicable

7. FLOATING BACK-TO-TOP BUTTON: Add a small button (bottom-right, position absolute or scroll-based JS) that appears after scrolling. Pure CSS/JS, smooth scroll to top. 44px circle, var(--primary) background, white arrow, box-shadow.

8. FOOTER TRUST BADGES ROW: Every footer must include a row of trust indicators with emoji/SVG icons and labels, centered, var(--muted-foreground) styling.

9. FORM FIELDS: All inputs must have placeholder examples, visible labels, focus ring with var(--primary), and validation-ready styling classes.

10. MOBILE-FIRST RESPONSIVE: ALL CSS must include @media (max-width: 768px) and @media (max-width: 480px) with stacked layouts, min 44px tap targets, min 16px font on mobile, reduced section padding (48-64px).

ITERATIVE EDITING MODE:
When the user's message includes sections labeled "CURRENT HTML:", "CURRENT CSS:", and "CURRENT JAVASCRIPT:" followed by code blocks and then an edit request:
- Apply ONLY the requested changes to the provided code. Do NOT regenerate from scratch.
- Keep all unchanged sections exactly as they are.
- Always return the COMPLETE updated code so the preview renders correctly.
- Maintain the same design system, colors, and layout unless specifically asked to change them.
- If asked to add a new section, insert it in a logical position without removing existing sections.
- If asked to change a specific element (color, size, text), find and modify only that element.`;

    const standardSystemPrompt = `You are an expert full-stack web developer and UI designer. You create stunning, modern, production-quality websites.

${DESIGN_CONSTITUTION}

${FORMS_FOR_CHAT}

Every page MUST include a :root token block in a <style> tag in <head> using the skeleton below. REWRITE the values for this specific project per the art-direction ritual; do not ship the placeholder palette.

<style>
${TOKEN_SKELETON}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    color: hsl(var(--foreground));
    background: hsl(var(--background));
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
</style>

${COLOR_RULES}

When using Tailwind classes, map them to the tokens via arbitrary values:
- text-[hsl(var(--foreground))] instead of text-slate-800
- bg-[hsl(var(--primary))] instead of bg-indigo-600
- text-[hsl(var(--muted-foreground))] instead of text-gray-500
- bg-[hsl(var(--hero-bg))] instead of bg-slate-900
Or use inline style="color: hsl(var(--foreground))" which is equally reliable.

LAYOUT AND TYPOGRAPHY:
- Include in HTML head: <script src="https://cdn.tailwindcss.com"><\/script> and <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
- Headings: font-weight 700-800, sizes 2.5rem-4rem hero, 1.5rem-2rem sections
- Body: 1rem-1.125rem, line-height 1.6-1.75
- Sections: 80-128px vertical padding
- Container: max-width 1200px, centered, px-6 on mobile
- Cards: 16px border-radius, 24-32px padding, subtle box-shadow: 0 1px 3px rgba(0,0,0,0.06)
- Buttons: 10px border-radius, 16px 32px padding, font-weight 600
- Mobile responsive with grid-cols-1 md:grid-cols-2 lg:grid-cols-3

${HERO_PATTERNS}

CODE OUTPUT:
1. DEFAULT SHAPE: return ONE self-contained HTML file in a single \`\`\`html code block. The HTML must include the design token <style> block above in the <head>, all CSS inline in a <style> tag, and all JavaScript inline in a <script> tag before </body>. This is the format users can download and open directly.
2. THREE-BLOCK SHAPE (only when the user explicitly asks for separate files): return exactly three blocks in this order — \`\`\`html, \`\`\`css, \`\`\`javascript — and in that mode the HTML MUST explicitly link the sibling files with:
   <link rel="stylesheet" href="./styles.css" />
   <script src="./index.js" defer></script>
   so nothing orphans when the files are saved side by side.
3. ALL color references must use hsl(var(--token-name)) or var(--token-name) syntax — never raw hex or Tailwind color classes.
4. Include meta viewport tag for mobile in every page.
5. Any interactive feature (mobile nav toggle, FAQ accordion, back-to-top, form validation) requires JS — inline it in the default shape.

USER-UPLOADED IMAGES:
When the user uploads images, use the provided URLs in <img> tags. Do NOT use placeholder URLs when real images are provided.

BROWSER AUTOMATION:
This app has browser automation. For browsing tasks, tell users: /browse [task description]

CONVERSION OPTIMIZATION RULES (MANDATORY FOR ALL PAGES):

1. STICKY NAVIGATION: Every page MUST include a sticky navigation bar at the top with a CTA button visible while scrolling. Use position: sticky; top: 0; z-index: 1000; with a solid background and subtle box-shadow on scroll.

2. HERO SECTION — AIDA FRAMEWORK:
   - Attention: Bold headline with a SPECIFIC benefit. E.g., "Grow Your Revenue 3x in 90 Days" not "Welcome to Our Website"
   - Interest: 2-line subheadline addressing the target audience's specific pain point
   - Desire: Social proof stat or trust badge immediately visible ("Trusted by 2,500+ businesses" or a star rating)
   - Action: Single high-contrast CTA button with an action verb like "Get Started Free", "Book Your Call", "Claim Your Spot"

3. URGENCY ELEMENTS: Include where appropriate:
   - "Limited spots available" or "Only X seats remaining" badges
   - "Join 2,500+ businesses" social proof counters
   - Time-sensitive language ("Start your free trial today", "This week only")
   - CSS-only countdown timer placeholders where relevant

4. CTA MICRO-COPY: Every CTA button MUST have small reassurance text directly below it:
   - "No credit card required" / "Cancel anytime" / "Free 14-day trial" / "100% money-back guarantee"
   - Style: font-size 12-13px, color var(--muted-foreground), margin-top 8px

5. TESTIMONIAL SECTIONS MUST include:
   - Real-looking names and job titles ("Sarah Chen, Marketing Director at TechCorp")
   - Photo placeholders using gradient circles with initials (CSS-only, no external images)
   - SPECIFIC results with numbers: "Grew revenue 340% in 6 months", "Saved 15 hours per week"
   - Star ratings displayed prominently

6. PRICING SECTIONS MUST have:
   - A "Most Popular" tier highlighted with a different background (var(--primary) bg or a subtle border/ring)
   - A "Best Value" badge on the annual/highest tier
   - Clear feature comparison with checkmarks and X marks
   - Monthly/annual toggle where applicable

7. FLOATING BACK-TO-TOP BUTTON: Add a small fixed button (bottom-right corner) that appears after scrolling. Pure CSS/JS, smooth scroll to top. 44px circle, var(--primary) background, white arrow icon, box-shadow, opacity transition.

8. FOOTER TRUST BADGES ROW: Every footer must include a row of trust indicators with emoji/SVG icons and labels, centered, var(--muted-foreground) styling.

9. FORM FIELDS: All inputs must have placeholder examples, visible labels, focus ring with var(--primary), and validation-ready styling classes.

10. MOBILE-FIRST RESPONSIVE: ALL CSS must include @media (max-width: 768px) and @media (max-width: 480px) with stacked layouts, min 44px tap targets, min 16px font on mobile, reduced section padding (48-64px), and hamburger navigation on mobile.

ITERATIVE EDITING MODE:
When the user's message includes sections labeled "CURRENT HTML:", "CURRENT CSS:", and "CURRENT JAVASCRIPT:" followed by code blocks and then an edit request:
- Apply ONLY the requested changes to the provided code. Do NOT regenerate from scratch.
- Keep all unchanged sections exactly as they are.
- Always return the COMPLETE updated code so the preview renders correctly.
- Maintain the same design system, colors, and layout unless specifically asked to change them.
- If asked to add a new section, insert it in a logical position without removing existing sections.
- If asked to change a specific element (color, size, text), find and modify only that element.`;

    const basePrompt = ghlMode ? ghlSystemPrompt : standardSystemPrompt;

    // Build the final system prompt with optional design system and marketing purpose
    const promptParts: string[] = [];
    if (clientDesignMd) {
      promptParts.push(`CRITICAL: Follow this design system EXACTLY for all colors, typography, spacing, and components. Every visual decision must come from this system. Do not invent your own colors.\n\n${clientDesignMd}`);
    }
    if (marketingMd) {
      promptParts.push(`PAGE PURPOSE & CONVERSION RULES:\n${marketingMd}`);
    }
    promptParts.push(basePrompt);
    const systemPrompt = promptParts.join('\n\n');

    // Fetch Honcho memory context (non-blocking on failure)
    let honchoContext = '';
    try {
      honchoContext = await getHonchoContext(user.id);
      if (honchoContext) {
        console.log('[CHAT] Honcho context loaded, length:', honchoContext.length);
      }
    } catch (err) {
      console.error('[CHAT] Honcho context failed (proceeding without):', err);
    }

    // Industry token-value PRESETS (starting points the model may adapt during
    // the art-direction ritual — not raw hex mandates). Values are bare HSL
    // triples ready to plug into the token skeleton.
    const industryOverrides: Record<string, {
      tokens: { primary: string; accent: string; heroBg: string; heroForeground: string; background: string; foreground: string };
      fontMood: string; extraInstruction: string;
    }> = {
      'beauty-spa':  { tokens: { primary: '43 74% 52%',  accent: '350 55% 82%', heroBg: '350 50% 96%',   heroForeground: '20 15% 20%',  background: '20 40% 98%',  foreground: '20 15% 15%'   }, fontMood: 'elegant serif display + humanist body', extraInstruction: 'Soft shadows, organic shapes, calming warm palette. Premium spa aesthetic — restraint over decoration.' },
      'saas':        { tokens: { primary: '244 75% 57%', accent: '188 94% 42%', heroBg: '222 47% 11%',   heroForeground: '210 40% 98%', background: '0 0% 100%',   foreground: '222 47% 11%'  }, fontMood: 'modern geometric sans (e.g. Space Grotesk display + Inter body)', extraInstruction: 'Clean, technical, product-forward. One signature product visual, not another gradient blob.' },
      'real-estate': { tokens: { primary: '43 60% 54%',  accent: '155 40% 30%', heroBg: '222 40% 12%',   heroForeground: '43 60% 90%',  background: '0 0% 100%',   foreground: '222 40% 12%'  }, fontMood: 'premium serif headings + refined sans body', extraInstruction: 'Luxury with gold accents. Large property imagery. Trust signals prominent.' },
      'restaurant':  { tokens: { primary: '11 60% 48%',  accent: '38 82% 63%',  heroBg: '20 8% 12%',     heroForeground: '38 40% 92%',  background: '30 20% 96%',  foreground: '20 8% 15%'    }, fontMood: 'warm display serif or hand-lettered + humanist body', extraInstruction: 'Warm, inviting, food-focused. Menu-style layouts. Large food imagery areas.' },
      'healthcare':  { tokens: { primary: '217 91% 45%', accent: '160 84% 32%', heroBg: '214 60% 95%',   heroForeground: '222 47% 15%', background: '0 0% 100%',   foreground: '222 47% 15%'  }, fontMood: 'clean trustworthy sans', extraInstruction: 'Clean, clinical, trustworthy. Generous whitespace, calm navigation.' },
      'coaching':    { tokens: { primary: '262 83% 58%', accent: '38 92% 50%',  heroBg: '224 71% 12%',   heroForeground: '210 40% 98%', background: '0 0% 100%',   foreground: '222 47% 11%'  }, fontMood: 'bold motivational sans display', extraInstruction: 'Energetic, transformation-focused. Testimonials prominent. Authority positioning.' },
      'fintech':     { tokens: { primary: '160 84% 39%', accent: '217 91% 60%', heroBg: '20 6% 10%',     heroForeground: '160 30% 90%', background: '0 0% 100%',   foreground: '20 6% 12%'    }, fontMood: 'precise sans with mono numerals', extraInstruction: 'Premium, data-driven. Trust badges essential. Number-first hero.' },
      'ecommerce':   { tokens: { primary: '222 47% 11%', accent: '0 84% 60%',   heroBg: '0 0% 100%',     heroForeground: '222 47% 11%', background: '0 0% 100%',   foreground: '222 47% 11%'  }, fontMood: 'clean shopping sans', extraInstruction: 'Product-forward, clean grids. Trust badges near purchase buttons.' },
      'portfolio':   { tokens: { primary: '210 40% 98%', accent: '262 70% 70%', heroBg: '222 47% 5%',    heroForeground: '210 40% 98%', background: '222 47% 8%',  foreground: '210 40% 98%'  }, fontMood: 'editorial mixed serif + sans', extraInstruction: 'Creative, showcase-focused. Minimal UI, maximum content.' },
      'event':       { tokens: { primary: '262 83% 58%', accent: '38 92% 50%',  heroBg: '244 65% 15%',   heroForeground: '210 40% 98%', background: '0 0% 100%',   foreground: '222 47% 11%'  }, fontMood: 'bold event display', extraInstruction: 'Urgency-driven. Countdown, speaker photos, strong registration CTA.' },
    };

    let detectedCategory: string | null = conversationCategory || null;

    // Only auto-detect if no design template is manually selected AND no cached category
    if (!clientDesignMd && !detectedCategory) {
      const lastMsg = messages[messages.length - 1];
      const latestUserMsg = typeof lastMsg?.content === 'string'
        ? lastMsg.content
        : Array.isArray(lastMsg?.content)
          ? lastMsg.content.find((b: any) => b.type === 'text')?.text || ''
          : '';
      if (latestUserMsg && latestUserMsg.length > 10) {
        try {
          const classificationPrompt = `Classify this website request into ONE category. Return ONLY the category name, nothing else.\nCategories: saas, agency, ecommerce, healthcare, restaurant, real-estate, legal, beauty-spa, fitness, education, coaching, fintech, portfolio, nonprofit, event, local-business, general\nRequest: "${latestUserMsg}"`;

          const classRes = await fetchWithTimeout(ANTHROPIC_API_URL, {
            method: 'POST',
            headers: {
              'x-api-key': anthropicApiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: MODELS.CLASSIFIER,
              max_tokens: 20,
              messages: [{ role: 'user', content: classificationPrompt }],
            }),
          }, TIMEOUT_AI_MS);

          if (classRes.ok) {
            const classData = await classRes.json();
            const raw = classData?.content?.[0]?.text?.trim().toLowerCase().replace(/[^a-z-]/g, '') || '';
            if (raw && raw !== 'general') {
              detectedCategory = raw;
              console.log('[CHAT] Auto-detected industry category:', detectedCategory);
            }
          }
        } catch (err) {
          console.error('[CHAT] Industry classification failed (proceeding without):', err);
        }
      }
    }

    // Enrich the system prompt with memory context
    let enrichedPrompt = honchoContext
      ? systemPrompt + '\n\nUSER CONTEXT (from memory — use this to personalize your responses):\n' + honchoContext
      : systemPrompt;

    // Apply industry-specific design overrides if detected and no manual template
    if (!clientDesignMd && detectedCategory) {
      const override = industryOverrides[detectedCategory];
      if (override) {
        const t = override.tokens;
        enrichedPrompt += '\n\nINDUSTRY TOKEN PRESET (auto-detected: ' + detectedCategory + '). Starting point only — adapt during the art-direction step so this page does not look interchangeable with every other ' + detectedCategory + ' page. Values are bare HSL triples for the token block:\n';
        enrichedPrompt += '  --background: ' + t.background + ';\n';
        enrichedPrompt += '  --foreground: ' + t.foreground + ';\n';
        enrichedPrompt += '  --primary: ' + t.primary + ';\n';
        enrichedPrompt += '  --accent: ' + t.accent + ';\n';
        enrichedPrompt += '  --hero-bg: ' + t.heroBg + ';\n';
        enrichedPrompt += '  --hero-foreground: ' + t.heroForeground + ';\n';
        enrichedPrompt += 'Typography mood: ' + override.fontMood + '.\n';
        enrichedPrompt += 'Design direction: ' + override.extraInstruction + '\n';
        enrichedPrompt += 'Contrast and readability rules from the constitution still apply — verify every text/background pair.';
      }
    }

    const response = await fetchWithTimeout(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: routeChatModel(messages, {
          ghlMode: !!ghlMode,
          hasDesignMd: !!clientDesignMd,
          hasMarketingMd: !!marketingMd,
        }),
        max_tokens: 32000,
        system: enrichedPrompt,
        messages,
        stream: true,
      }),
    }, TIMEOUT_AI_MS);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Failed to call Anthropic API' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Track usage after successful API call
    await supabaseClient
      .from('usage_tracking')
      .insert({
        user_id: user.id,
        usage_type: 'chat_message',
        quantity: 1
      });

    // Store user message in Honcho (fire-and-forget)
    const latestUserMessage = messages[messages.length - 1]?.content || '';
    if (latestUserMessage) {
      storeHonchoMessages(user.id, latestUserMessage, '(streaming response — captured on next turn)')
        .catch(err => console.error('[CHAT] Honcho background store error:', err));
    }

    // Stream the response, prepending detected category as a custom SSE event
    const categoryEvent = detectedCategory
      ? new TextEncoder().encode(`event: category\ndata: ${JSON.stringify({ category: detectedCategory })}\n\n`)
      : null;

    const bodyStream = new ReadableStream({
      async start(controller) {
        if (categoryEvent) controller.enqueue(categoryEvent);
        const reader = response.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(bodyStream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
