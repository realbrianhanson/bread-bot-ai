import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header provided' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Extract JWT from authorization header
    const jwt = authHeader.replace('Bearer ', '');

    // Get user using the JWT token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);
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

    // Check if user has exceeded their limit
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
      // Lifetime tier: try to use user's own key
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
        // Fall back to shared key if user hasn't provided their own
        anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
        console.log('Using shared Anthropic API key (user has BYOK but no key configured)');
      }
    } else {
      // All other tiers: use shared API key
      anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
      console.log('Using shared Anthropic API key');
    }

    if (!anthropicApiKey) {
      return new Response(JSON.stringify({ error: 'Anthropic API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages } = await req.json();

    console.log('Calling Anthropic API with', messages.length, 'messages');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
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