import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BROWSER_USE_API_URL = 'https://api.browser-use.com/api/v3';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[STOP-BROWSER-TASK] Request received');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { taskId } = await req.json();

    if (!taskId) {
      return new Response(JSON.stringify({ error: 'Task ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: task, error: taskError } = await supabaseClient
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (taskError || !task) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const outputData = task.output_data as any;
    const browserUseTaskId = outputData?.browser_use_task_id;

    if (!browserUseTaskId) {
      return new Response(JSON.stringify({ error: 'Browser Use task ID not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: usageData } = await supabaseClient.rpc('get_user_tier_and_usage', {
      p_user_id: user.id
    });
    const usage = usageData?.[0];

    let browserUseApiKey: string;
    if (usage?.can_use_own_keys) {
      const { data: apiKeyData } = await supabaseClient
        .from('api_keys')
        .select('encrypted_key')
        .eq('user_id', user.id)
        .eq('provider', 'browser_use')
        .eq('is_active', true)
        .maybeSingle();

      browserUseApiKey = apiKeyData?.encrypted_key || (Deno.env.get('BROWSER_USE_API_KEY') ?? '');
    } else {
      browserUseApiKey = Deno.env.get('BROWSER_USE_API_KEY') ?? '';
    }

    const stopResponse = await fetch(`${BROWSER_USE_API_URL}/task/${browserUseTaskId}/stop`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${browserUseApiKey}`,
      },
    });

    if (!stopResponse.ok) {
      const errorText = await stopResponse.text();
      console.error('Failed to stop Browser Use task:', errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to stop task',
        details: errorText 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabaseClient
      .from('tasks')
      .update({
        status: 'stopped',
        completed_at: new Date().toISOString(),
        error_message: 'Task stopped by user',
      })
      .eq('id', taskId);

    console.log('Task stopped successfully:', taskId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Task stopped successfully',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in stop-browser-task function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
