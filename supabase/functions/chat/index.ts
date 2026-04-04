import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    const systemPrompt = `You are an expert full-stack web developer and UI designer with browser automation capabilities. You create stunning, modern, production-quality web applications.

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

BROWSER AUTOMATION:
This application has browser automation built-in. When users ask to visit websites, search the web, scrape data, or perform any browsing task, tell them to use the /browse command:
"/browse [describe your task]"
Do NOT say you cannot browse — the app has this feature via the /browse command.`;

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
        system: systemPrompt,
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
