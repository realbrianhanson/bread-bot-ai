import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const HONCHO_API_BASE = 'https://api.honcho.dev/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const honchoApiKey = Deno.env.get('HONCHO_API_KEY');
    const workspaceId = Deno.env.get('HONCHO_WORKSPACE_ID');

    if (!honchoApiKey || !workspaceId) {
      return new Response(JSON.stringify({ error: 'Memory system not configured', available: false }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, query } = await req.json();
    const peerId = user.id;
    const headers = { 'Authorization': `Bearer ${honchoApiKey}`, 'Content-Type': 'application/json' };

    // Check availability
    if (action === 'status') {
      return new Response(JSON.stringify({ available: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get context summary
    if (action === 'context') {
      // Ensure peer exists
      await fetch(`${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/${peerId}`, {
        method: 'PUT', headers,
        body: JSON.stringify({ configuration: { observe_me: true } }),
      });

      // Create a session for context retrieval
      const sessionRes = await fetch(`${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/${peerId}/sessions`, {
        method: 'POST', headers,
        body: JSON.stringify({ metadata: { source: 'settings_context' } }),
      });
      const session = await sessionRes.json();

      const contextRes = await fetch(
        `${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/${peerId}/sessions/${session.id}/context`,
        { method: 'POST', headers, body: JSON.stringify({ max_tokens: 3000 }) },
      );
      const contextData = await contextRes.json();

      return new Response(JSON.stringify({
        context: contextData?.context || contextData?.content || 'No memory data yet. Start chatting to build your profile!',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Chat/query memory
    if (action === 'chat') {
      if (!query) {
        return new Response(JSON.stringify({ error: 'Query is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const chatRes = await fetch(`${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/${peerId}/chat`, {
        method: 'POST', headers,
        body: JSON.stringify({ query }),
      });
      const chatData = await chatRes.json();

      return new Response(JSON.stringify({
        response: chatData?.response || chatData?.content || 'No information found.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clear memory
    if (action === 'clear') {
      // Delete the peer
      await fetch(`${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/${peerId}`, {
        method: 'DELETE', headers,
      });

      // Recreate fresh
      await fetch(`${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/${peerId}`, {
        method: 'PUT', headers,
        body: JSON.stringify({ configuration: { observe_me: true } }),
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[HONCHO-PROXY] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
