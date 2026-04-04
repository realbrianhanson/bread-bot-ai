import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const HONCHO_API_BASE = 'https://api.honcho.dev/v1';

async function getHonchoContext(userId: string): Promise<string> {
  const apiKey = Deno.env.get('HONCHO_API_KEY');
  const workspaceId = Deno.env.get('HONCHO_WORKSPACE_ID');
  if (!apiKey || !workspaceId) return '';

  const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

  try {
    await fetch(`${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/${userId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ configuration: { observe_me: true } }),
    });

    await fetch(`${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/assistant`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ configuration: { observe_me: false } }),
    });

    const sessionRes = await fetch(`${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/${userId}/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ metadata: { source: 'chat' } }),
    });
    const session = await sessionRes.json();

    const contextRes = await fetch(
      `${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/${userId}/sessions/${session.id}/context`,
      { method: 'POST', headers, body: JSON.stringify({ max_tokens: 2000 }) },
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
    const sessionRes = await fetch(`${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/${userId}/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ metadata: { source: 'chat_store' } }),
    });
    const session = await sessionRes.json();

    await fetch(`${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/${userId}/sessions/${session.id}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify([
        { peer_id: userId, content: userMessage },
        { peer_id: 'assistant', content: assistantMessage },
      ]),
    });
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
        error: `You've reached your monthly limit of ${usage.chat_messages_limit} messages. Please upgrade your plan to continue.`,
        limit_exceeded: true 
      }), {
        status: 429,
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
        anthropicApiKey = apiKeyData.encrypted_key;
        console.log('Using user\'s own Anthropic API key');
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

    const { messages, ghlMode, designMd: clientDesignMd, marketingMd } = await req.json();

    console.log('Calling Anthropic API with', messages.length, 'messages, ghlMode:', !!ghlMode, 'hasDesignMd:', !!clientDesignMd, 'hasMarketingMd:', !!marketingMd);

    const DESIGN_TOKENS = `  :root {
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

    const COLOR_RULES = `COLOR USAGE RULES (ABSOLUTE — NEVER BREAK):
- Page background: var(--background)
- All body/paragraph text: var(--foreground) — this is ALWAYS dark, always readable
- Headings on light backgrounds: var(--foreground) or var(--card-foreground)
- Muted/subtitle text: var(--muted-foreground)
- Cards: background var(--card), text var(--card-foreground)
- Buttons primary: background var(--primary), text var(--primary-foreground)
- Buttons secondary: background var(--secondary), text var(--secondary-foreground)
- Hero/dark sections: background var(--hero-bg), text var(--hero-foreground), muted text var(--hero-muted)
- Alternating sections: var(--section-alt) background with var(--foreground) text
- Borders: var(--border)
- Links and interactive accents: var(--primary)
- NEVER use text-white on anything except var(--hero-bg), var(--primary), or var(--destructive) backgrounds
- NEVER use any pastel, light, or translucent color for text. All text must use a --foreground or --*-foreground token.
- NEVER use raw CSS color values (no color: white, color: #aaa, color: lavender, etc). ONLY use var(--token-name).`;

    const HERO_PATTERNS = `HERO SECTION PATTERNS (pick one per page):
Pattern A — Dark hero: bg var(--hero-bg), all text var(--hero-foreground), subtitle var(--hero-muted), CTA button bg var(--accent) text var(--accent-foreground)
Pattern B — Light hero with accent: bg var(--background), heading var(--foreground), subtitle var(--muted-foreground), CTA bg var(--primary) text var(--primary-foreground)
Pattern C — Gradient hero: bg gradient from var(--hero-bg) to a slightly lighter dark tone like #1E293B, text var(--hero-foreground)
NEVER: light/pastel gradient with light text. If the background has ANY light tones, ALL text must use var(--foreground).`;

    const ghlSystemPrompt = `You are an elite direct-response landing page designer who specializes in GoHighLevel (GHL) funnel pages. You create high-converting, visually stunning landing pages that work PERFECTLY inside GHL's Custom Code element.

CRITICAL DESIGN RULE: You MUST use the CSS design tokens defined below for ALL colors. NEVER use raw color values like text-white, bg-purple-300, text-gray-400, #A78BFA, color: white, color: #ccc, etc. ALWAYS reference the CSS variables. This ensures every page has perfect contrast and readability.

Every page you generate MUST include this CSS variable block inside the scoped wrapper's <style> tag. These are your ONLY allowed colors:

${DESIGN_TOKENS}

${COLOR_RULES}

CRITICAL GHL TECHNICAL RULES:
- ALL CSS must be inside a single <style> tag with a unique wrapper class (e.g., .ghl-custom-xyz) to prevent conflicts with GHL's own CSS
- NEVER use Tailwind CDN or any external CSS framework — GHL may strip external script/link tags
- NEVER use external font CDN links — use system font stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- ALL code must be in a SINGLE code block — one self-contained HTML blob with embedded <style> and <script> tags
- Wrap EVERYTHING in a single container div with a unique class like <div class="ghl-lander-[random4chars]"> to scope all styles
- Images should use placeholder URLs from https://placehold.co/ with descriptive alt text
- Do NOT use position: fixed or position: sticky — GHL's builder can break these
- Maximum width should be 100% — GHL handles the page container
- The code must be mobile-responsive using CSS media queries (not Tailwind breakpoints)

BODY STYLES (set on the wrapper class):
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
color: var(--foreground);
background: var(--background);
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
ALL color references must use var(--token-name) syntax. No raw colors anywhere.

USER-UPLOADED IMAGES:
When the user uploads images, use the provided URLs in <img> tags. Do NOT use placeholder URLs when real images are provided.

BROWSER AUTOMATION:
This app has browser automation. For browsing tasks, tell users: /browse [task description]`;

    const standardSystemPrompt = `You are an expert full-stack web developer and UI designer. You create stunning, modern, production-quality websites.

CRITICAL DESIGN RULE: You MUST use the CSS design tokens defined below for ALL colors. NEVER use raw color values like text-white, bg-purple-300, text-gray-400, #A78BFA, etc. in your HTML. ALWAYS reference the CSS variables. This ensures every page has perfect contrast and readability.

Every page you generate MUST include this CSS variable block in a <style> tag in the <head>. These are your ONLY allowed colors:

<style>
${DESIGN_TOKENS}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    color: var(--foreground);
    background: var(--background);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
</style>

${COLOR_RULES}

- NEVER use raw Tailwind color classes for text (no text-purple-300, text-blue-400, text-gray-300, etc). ONLY use the CSS variables above via inline styles or custom Tailwind classes.

When using Tailwind classes, map them to the tokens:
- text-[var(--foreground)] instead of text-slate-800
- bg-[var(--primary)] instead of bg-indigo-600
- text-[var(--muted-foreground)] instead of text-gray-500
- bg-[var(--hero-bg)] instead of bg-slate-900
Or use inline style="color: var(--foreground)" which is even more reliable.

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
1. ALWAYS provide complete working code in three blocks: html, css, javascript
2. The HTML MUST include the design token <style> block above in the <head>
3. ALL color references in the HTML must use var(--token-name) syntax
4. JavaScript block is REQUIRED for any interactive features
5. Include meta viewport tag for mobile

USER-UPLOADED IMAGES:
When the user uploads images, use the provided URLs in <img> tags. Do NOT use placeholder URLs when real images are provided.

BROWSER AUTOMATION:
This app has browser automation. For browsing tasks, tell users: /browse [task description]`;

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

    // Enrich the system prompt with memory context
    const enrichedPrompt = honchoContext
      ? systemPrompt + '\n\nUSER CONTEXT (from memory — use this to personalize your responses):\n' + honchoContext
      : systemPrompt;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 32000,
        system: enrichedPrompt,
        messages,
        stream: true,
      }),
    });

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

    // Stream the response
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
