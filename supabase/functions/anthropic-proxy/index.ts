import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";
import { ANTHROPIC_API_URL, ANTHROPIC_ALLOWED_MODELS, MODELS, fetchWithTimeout, TIMEOUT_AI_MS } from "../_shared/config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type, x-build-token, x-task-id',
};
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

const MAX_TOKENS_CAP = 16384;
const RATE_LIMIT_PER_MIN = 120;

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

    // Require an authenticated user whose id matches the task's user_id.
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing user credentials' }), { status: 401, headers: jsonHeaders });
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid user token' }), { status: 401, headers: jsonHeaders });
    }
    const authedUserId = userData.user.id;

    const { data: task } = await supabase
      .from('tasks')
      .select('task_type, status, output_data, user_id')
      .eq('id', taskId)
      .single();

    if (
      !task ||
      task.task_type !== 'app_build' ||
      task.output_data?.build_token !== buildToken ||
      !['initializing', 'running'].includes(task.status) ||
      task.user_id !== authedUserId
    ) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
    }

    // Per-user rate limit: 120 requests / minute
    const { data: rl } = await supabase.rpc('check_and_increment_rate_limit', {
      p_user_id: authedUserId,
      p_usage_type: 'anthropic_proxy',
      p_limit: RATE_LIMIT_PER_MIN,
      p_window_seconds: 60,
    });
    if (rl && !rl.allowed) {
      return new Response(JSON.stringify({ error: 'rate_limited', message: 'Too many requests. Slow down.' }), {
        status: 429, headers: jsonHeaders,
      });
    }

    const body = await req.json();
    if (!ANTHROPIC_ALLOWED_MODELS.includes(body.model)) {
      body.model = MODELS.BUILDER_FAST;
    }
    if (typeof body.max_tokens !== 'number' || body.max_tokens > MAX_TOKENS_CAP) {
      body.max_tokens = MAX_TOKENS_CAP;
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 500, headers: jsonHeaders });
    }

    const upstream = await fetchWithTimeout(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    }, TIMEOUT_AI_MS);

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