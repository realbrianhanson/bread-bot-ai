import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-build-token, x-task-id',
};
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

const ALLOWED_MODELS = ['claude-sonnet-4-6', 'claude-fable-5', 'claude-opus-4-8', 'claude-haiku-4-5-20251001'];
const MAX_TOKENS_CAP = 16384;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: jsonHeaders });
  }

  try {
    const buildToken = req.headers.get('x-build-token');
    const taskId = req.headers.get('x-task-id');
    if (!buildToken || !taskId) {
      return new Response(JSON.stringify({ error: 'Missing build credentials' }), { status: 401, headers: jsonHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const { data: task } = await supabase
      .from('tasks')
      .select('task_type, status, output_data')
      .eq('id', taskId)
      .single();

    if (
      !task ||
      task.task_type !== 'app_build' ||
      task.output_data?.build_token !== buildToken ||
      !['initializing', 'running'].includes(task.status)
    ) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
    }

    const body = await req.json();
    if (!ALLOWED_MODELS.includes(body.model)) {
      body.model = 'claude-sonnet-4-6';
    }
    if (typeof body.max_tokens !== 'number' || body.max_tokens > MAX_TOKENS_CAP) {
      body.max_tokens = MAX_TOKENS_CAP;
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 500, headers: jsonHeaders });
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('[ANTHROPIC-PROXY] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: jsonHeaders });
  }
});