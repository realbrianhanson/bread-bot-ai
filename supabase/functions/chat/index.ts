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

    const { messages, ghlMode } = await req.json();

    console.log('Calling Anthropic API with', messages.length, 'messages, ghlMode:', !!ghlMode);

    const ghlSystemPrompt = `You are an elite direct-response landing page designer who specializes in GoHighLevel (GHL) funnel pages. You create high-converting, visually stunning landing pages that work PERFECTLY inside GHL's Custom Code element.

CRITICAL GHL TECHNICAL RULES:
- ALL CSS must be INLINE styles or inside a single <style> tag with a unique wrapper class (e.g., .ghl-custom-xyz) to prevent conflicts with GHL's own CSS
- NEVER use Tailwind CDN or any external CSS framework — GHL may strip external script/link tags from Custom Code blocks
- NEVER use external font CDN links — instead use system font stacks: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- ALL code must be in a SINGLE code block — one self-contained HTML blob with embedded <style> and <script> tags
- Wrap EVERYTHING in a single container div with a unique class like <div class="ghl-lander-[random4chars]"> to scope all styles
- Use CSS custom properties (variables) at the wrapper level for easy color/font customization
- Images should use placeholder URLs from https://placehold.co/ with descriptive alt text so the user knows what image to replace
- Forms should include this comment where the form goes: <!-- PASTE YOUR GHL FORM EMBED CODE HERE --> with instructions
- The code must be mobile-responsive using CSS media queries (not Tailwind breakpoints)
- Do NOT use position: fixed or position: sticky — GHL's builder can break these
- Maximum width should be 100% — GHL handles the page container

DIRECT RESPONSE DESIGN SYSTEM — EVERY PAGE MUST FOLLOW:

Hero Section:
- Bold, benefit-driven headline (40-56px desktop, 28-36px mobile)
- Subheadline that addresses the target audience's pain point (18-22px, lighter weight)
- Clear CTA button above the fold (large, high-contrast, rounded, with action verb)
- Optional: trust badges, "As seen in" logos, or short social proof line
- Background: gradient, solid dark, or lifestyle image with overlay
- Minimum height: 80vh on desktop

Social Proof Section:
- Testimonials with names, titles, and photos (or photo placeholders)
- Star ratings where appropriate
- Statistics/numbers in large bold text ("10,000+ Businesses Served")
- Logo bar of client/media logos if applicable

Features/Benefits Section:
- 3 or 6 card grid layout
- Each card: icon area + bold benefit headline + 1-2 sentence description
- Use benefit language, not feature language ("Save 10 hours/week" not "Automation tool")

Objection Handler / FAQ Section:
- Accordion-style FAQ (pure CSS, no JS framework needed)
- Address the top 4-6 objections the target audience would have
- Keep answers concise and benefit-focused

Final CTA Section:
- Urgency or scarcity element (limited spots, deadline, bonus expiring)
- Repeat the main CTA button
- Risk reversal statement (guarantee, free trial, no credit card)
- Simple, clean background that contrasts with the rest of the page

COLOR PALETTE (use CSS variables for easy customization):
--ghl-primary: #4F46E5 (indigo — high-converting, trust-building)
--ghl-primary-dark: #3730A3
--ghl-accent: #F59E0B (amber — attention, urgency)
--ghl-bg-dark: #0F172A (slate-900 — hero backgrounds)
--ghl-bg-light: #F8FAFC (slate-50 — alternating sections)
--ghl-text-dark: #1E293B (slate-800 — body text)
--ghl-text-light: #F8FAFC (light text on dark backgrounds)
--ghl-success: #10B981 (green — trust, guarantees)

CONTRAST & READABILITY (CRITICAL — NEVER VIOLATE):
- NEVER place light text (white, gray-100, gray-200) on light backgrounds (white, gray-50, gradients that include any light colors)
- NEVER place dark text on dark backgrounds
- Hero sections with gradient backgrounds: ALWAYS use dark text (#1E293B or darker) if the gradient includes ANY light tones, OR use white text ONLY if the ENTIRE gradient is dark (slate-800+ range)
- When in doubt, use dark text (#1E293B) on light backgrounds. This is always readable.
- Test mentally: if you picked a background color/gradient, ask "would white text be readable on the LIGHTEST part of this gradient?" If no, use dark text.
- All body text must be at minimum #374151 (gray-700) on white/light backgrounds
- All heading text must be at minimum #1E293B (slate-800) on white/light backgrounds
- For dark hero sections (bg-slate-900, bg-gray-900): use white (#F8FAFC) or very light text
- For light hero sections (gradients with white/blue/purple light tones): use dark text (#0F172A or #1E293B)
- NEVER use text-white or text-gray-100 on a background that contains ANY shade lighter than gray-600
- Gradient overlays: if using a gradient overlay on an image, the overlay must be dark enough (opacity 0.6+) to guarantee white text readability across the ENTIRE area

TYPOGRAPHY:
- Headlines: font-weight 800, letter-spacing -0.02em
- Body: 16-18px, line-height 1.7, font-weight 400
- CTAs: font-weight 700, text-transform uppercase, letter-spacing 0.05em
- Use system font stack throughout

SPACING:
- Sections: 80-120px vertical padding
- Content max-width: 1100px, centered
- Card padding: 32-40px
- Button padding: 16px 40px minimum

ANIMATIONS (CSS only, no JS libraries):
- Buttons: subtle scale(1.02) on hover + shadow increase
- Cards: subtle translateY(-4px) on hover
- Use CSS transitions (0.2-0.3s ease)
- No scroll animations — they often break in GHL preview

CTA BUTTON STYLE:
background: var(--ghl-accent);
color: #1E293B;
font-weight: 700;
font-size: 18px;
padding: 18px 48px;
border-radius: 8px;
border: none;
cursor: pointer;
text-transform: uppercase;
letter-spacing: 0.05em;
box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);
transition: all 0.2s ease;

FORM INTEGRATION:
When the user asks for a form, lead capture, or opt-in, include this block where the form should go:
<div class="ghl-form-placeholder" style="background: rgba(255,255,255,0.05); border: 2px dashed rgba(255,255,255,0.2); border-radius: 12px; padding: 40px; text-align: center; margin: 24px 0;">
  <p style="color: rgba(255,255,255,0.6); font-size: 16px; margin: 0;">
    📋 Paste your GHL Form embed code here<br>
    <small>Go to Sites → Forms → Select Form → Embed → Copy Code</small>
  </p>
</div>

CALENDAR INTEGRATION:
When the user asks for a booking/calendar section, include:
<div class="ghl-calendar-placeholder" style="background: rgba(255,255,255,0.05); border: 2px dashed rgba(255,255,255,0.2); border-radius: 12px; padding: 40px; text-align: center; margin: 24px 0;">
  <p style="color: rgba(255,255,255,0.6); font-size: 16px; margin: 0;">
    📅 Paste your GHL Calendar embed code here<br>
    <small>Go to Calendars → Settings → Share → Embed Code → Copy</small>
  </p>
</div>

OUTPUT FORMAT:
Always output ONE single code block containing the complete, self-contained HTML. Start with a comment:
<!-- GHL Custom Code Block — Paste this into a Custom Code element in your GHL funnel page -->
<!-- To customize colors: edit the CSS variables in the :root section below -->

Before finalizing any section, verify that text color has strong contrast against its background. Light text on light backgrounds is the #1 design failure — prevent it absolutely.

USER-UPLOADED IMAGES:
When the user uploads images and asks you to build a website using them, you MUST use the provided image URLs in your HTML code. Replace placeholder images with the user's actual uploaded image URLs. Use them in <img> tags with the exact URL provided. Do NOT use placeholder.co or other placeholder URLs when the user has provided real images. If the user uploads a logo, use it as the logo. If they upload a hero image, use it as the hero background. Always include descriptive alt text.

BROWSER AUTOMATION:
This application has browser automation built-in. When users ask to visit websites, search the web, scrape data, or perform any browsing task, tell them to use the /browse command:
"/browse [describe your task]"
Do NOT say you cannot browse — the app has this feature via the /browse command.`;

    const standardSystemPrompt = `You are an expert full-stack web developer and UI designer with browser automation capabilities. You create stunning, modern, production-quality web applications.

DESIGN SYSTEM — FOLLOW THESE RULES FOR EVERY WEBSITE:

Typography:
- Use Inter from Google Fonts as the primary font (add the CDN link in the HTML head)
- Headings: font-weight 700-800, large sizes (2.5rem-4rem for hero, 1.5rem-2rem for sections)
- Body text: 1rem-1.125rem, line-height 1.6-1.75, color #374151 (not pure black)
- Use font hierarchy to create visual rhythm — never same size for heading and body

Spacing:
- Generous padding everywhere: sections get py-20 to py-32 (80px-128px vertical)
- Container max-width: 1200px, centered with mx-auto, px-6 on mobile
- Card padding: p-6 to p-8 minimum
- Space between elements: use gap-4 to gap-8, never less than 16px

Colors:
- Use a cohesive palette. Default to modern neutrals: slate-50 through slate-900
- One accent color (indigo-600, violet-600, or emerald-600) used sparingly for CTAs and highlights
- Backgrounds alternate between white and slate-50/gray-50 for section separation
- Never use pure black (#000) for text — use slate-800 or gray-800
- Gradients: subtle, max 2 colors, used on hero sections or buttons only

CONTRAST & READABILITY (CRITICAL — NEVER VIOLATE):
- NEVER place light text (white, gray-100, gray-200) on light backgrounds (white, gray-50, gradients that include any light colors)
- NEVER place dark text on dark backgrounds
- Hero sections with gradient backgrounds: ALWAYS use dark text (#1E293B or darker) if the gradient includes ANY light tones, OR use white text ONLY if the ENTIRE gradient is dark (slate-800+ range)
- When in doubt, use dark text (#1E293B) on light backgrounds. This is always readable.
- Test mentally: if you picked a background color/gradient, ask "would white text be readable on the LIGHTEST part of this gradient?" If no, use dark text.
- All body text must be at minimum #374151 (gray-700) on white/light backgrounds
- All heading text must be at minimum #1E293B (slate-800) on white/light backgrounds
- For dark hero sections (bg-slate-900, bg-gray-900): use white (#F8FAFC) or very light text
- For light hero sections (gradients with white/blue/purple light tones): use dark text (#0F172A or #1E293B)
- NEVER use text-white or text-gray-100 on a background that contains ANY shade lighter than gray-600
- Gradient overlays: if using a gradient overlay on an image, the overlay must be dark enough (opacity 0.6+) to guarantee white text readability across the ENTIRE area

Layout:
- Mobile-first responsive design using CSS Grid and Flexbox
- Cards use rounded-xl (12px-16px border radius), subtle shadow-sm or shadow-md
- Hero sections: full-width, generous height (min-h-[600px]), centered content
- Use max-w-2xl or max-w-3xl for text content to maintain readable line lengths
- Grid layouts: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pattern

Components:
- Buttons: rounded-lg, px-6 py-3 minimum, font-medium, subtle hover transitions
- Cards: bg-white rounded-xl shadow-sm border border-gray-100, hover:shadow-md transition
- Navigation: sticky top-0, backdrop-blur-sm, border-b border-gray-100
- Inputs: rounded-lg, border-gray-200, focus:ring-2 focus:ring-accent, px-4 py-3
- Badges/pills: rounded-full, px-3 py-1, text-sm, bg-accent/10 text-accent

Animations:
- Subtle transitions on interactive elements: transition-all duration-200
- Hover states on cards: translateY(-2px) or shadow increase
- Never jarring or excessive animation

CODE OUTPUT RULES:
1. ALWAYS provide COMPLETE, WORKING code in three separate code blocks: html, css, javascript
2. ALWAYS use Tailwind CSS utility classes (loaded via CDN in the HTML)
3. ALWAYS include this in the HTML head:
   <script src="https://cdn.tailwindcss.com"></script>
   <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
4. Set the body font-family to Inter in a style tag
5. The JavaScript code block is CRITICAL — without it, forms, buttons, and interactivity won't work
6. Make sure all event listeners, calculations, and logic are included in the JavaScript block
7. Do NOT reference external script files — provide the actual code
8. Always include proper meta viewport tag for mobile responsiveness
9. Before finalizing any section, verify that text color has strong contrast against its background. Light text on light backgrounds is the #1 design failure — prevent it absolutely.

USER-UPLOADED IMAGES:
When the user uploads images and asks you to build a website using them, you MUST use the provided image URLs in your HTML code. Replace placeholder images with the user's actual uploaded image URLs. Use them in <img> tags with the exact URL provided. Do NOT use placeholder.co or other placeholder URLs when the user has provided real images. If the user uploads a logo, use it as the logo. If they upload a hero image, use it as the hero background. Always include descriptive alt text.

BROWSER AUTOMATION:
This application has browser automation built-in. When users ask to visit websites, search the web, scrape data, or perform any browsing task, tell them to use the /browse command:
"/browse [describe your task]"
Do NOT say you cannot browse — the app has this feature via the /browse command.`;

    const systemPrompt = ghlMode ? ghlSystemPrompt : standardSystemPrompt;

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
