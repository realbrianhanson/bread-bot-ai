import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GAMMA_MCP_URL = 'https://mcp.gamma.app/mcp';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { topic, content, numSlides, style } = await req.json();
    if (!topic || !content) {
      return new Response(JSON.stringify({ error: 'topic and content are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build the prompt for Gamma
    const slideCount = numSlides || 10;
    const styleHint = style ? ` Style: ${style}.` : '';
    const generatePrompt = `Create a ${slideCount}-slide presentation about: ${topic}\n\n${content}${styleHint}`;

    // Step 1: Initialize MCP session
    const initRes = await fetch(GAMMA_MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'BreadBot', version: '1.0.0' },
        },
      }),
    });

    if (!initRes.ok) {
      const errText = await initRes.text();
      console.error('[GENERATE-SLIDES] MCP init failed:', initRes.status, errText);
      return new Response(JSON.stringify({
        error: 'Failed to connect to Gamma',
        details: errText,
      }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Extract session ID from response headers
    const sessionId = initRes.headers.get('mcp-session-id') || '';
    console.log('[GENERATE-SLIDES] MCP session:', sessionId);

    // Step 2: Call the generate tool
    const mcpHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };
    if (sessionId) {
      mcpHeaders['mcp-session-id'] = sessionId;
    }

    const generateRes = await fetch(GAMMA_MCP_URL, {
      method: 'POST',
      headers: mcpHeaders,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'generate',
          arguments: {
            topic: generatePrompt,
          },
        },
      }),
    });

    if (!generateRes.ok) {
      const errText = await generateRes.text();
      console.error('[GENERATE-SLIDES] Gamma generate failed:', generateRes.status, errText);
      return new Response(JSON.stringify({
        error: 'Gamma generation failed',
        details: errText,
      }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Parse the response — may be JSON or SSE
    const contentType = generateRes.headers.get('content-type') || '';
    let gammaResult: any;

    if (contentType.includes('text/event-stream')) {
      // Parse SSE stream to get the final result
      const text = await generateRes.text();
      const lines = text.split('\n');
      let lastData = '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          lastData = line.slice(6);
        }
      }
      if (lastData) {
        gammaResult = JSON.parse(lastData);
      }
    } else {
      gammaResult = await generateRes.json();
    }

    console.log('[GENERATE-SLIDES] Result:', JSON.stringify(gammaResult).slice(0, 500));

    // Extract the URL from the MCP result
    let gammaUrl = '';
    let title = topic;
    let slideCountActual = slideCount;

    if (gammaResult?.result?.content) {
      for (const block of gammaResult.result.content) {
        if (block.type === 'text') {
          // Try to extract URL from the text
          const urlMatch = block.text.match(/https:\/\/gamma\.app\/[^\s)]+/);
          if (urlMatch) {
            gammaUrl = urlMatch[0];
          }
        }
      }
    }

    // Fallback: check if URL is in the top-level result
    if (!gammaUrl && gammaResult?.result) {
      const resultStr = JSON.stringify(gammaResult.result);
      const urlMatch = resultStr.match(/https:\/\/gamma\.app\/[^\s"')]+/);
      if (urlMatch) {
        gammaUrl = urlMatch[0];
      }
    }

    // Store task record
    await supabaseClient.from('tasks').insert({
      user_id: user.id,
      task_type: 'slides_generation',
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      input_data: { topic, numSlides: slideCount, style },
      output_data: {
        gammaUrl,
        title,
        numSlides: slideCountActual,
        mcpResult: gammaResult?.result || null,
      },
    });

    // Track usage
    await supabaseClient.from('usage_tracking').insert({
      user_id: user.id,
      usage_type: 'chat_message',
      quantity: 1,
    });

    return new Response(JSON.stringify({
      success: true,
      gammaUrl,
      title,
      numSlides: slideCountActual,
      rawResult: gammaResult?.result || null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[GENERATE-SLIDES] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
