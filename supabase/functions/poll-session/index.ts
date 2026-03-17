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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { taskId } = await req.json();
    if (!taskId) {
      return new Response(JSON.stringify({ error: 'Missing taskId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the task record
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
      return new Response(JSON.stringify({ error: 'No browser session ID found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If task is already terminal, just return current state
    if (['completed', 'failed', 'stopped'].includes(task.status)) {
      return new Response(JSON.stringify(task), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get API key
    const browserUseApiKey = Deno.env.get('BROWSER_USE_API_KEY') ?? '';
    if (!browserUseApiKey) {
      return new Response(JSON.stringify({ error: 'Browser Use API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Poll Browser Use v3 API for session status
    const sessionResponse = await fetch(`${BROWSER_USE_API_URL}/sessions/${browserUseTaskId}`, {
      headers: { 'X-Browser-Use-API-Key': browserUseApiKey },
    });

    if (!sessionResponse.ok) {
      const errText = await sessionResponse.text();
      console.error('[POLL-SESSION] API error:', errText);
      return new Response(JSON.stringify({ error: 'Failed to poll session', details: errText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sessionData = await sessionResponse.json();
    console.log('[POLL-SESSION] Session status:', sessionData.status, 'for task:', taskId);

    // Map Browser Use v3 status to our status
    // v3 statuses: created, idle, running, stopped, timed_out, error
    let mappedStatus = task.status;
    if (sessionData.status === 'stopped' || sessionData.status === 'idle') {
      // idle after running means finished
      if (task.status === 'running') {
        mappedStatus = sessionData.output ? 'completed' : 'completed';
      }
    } else if (sessionData.status === 'error' || sessionData.status === 'timed_out') {
      mappedStatus = 'failed';
    } else if (sessionData.status === 'running') {
      mappedStatus = 'running';
    }

    const isTerminal = ['completed', 'failed', 'stopped'].includes(mappedStatus) && mappedStatus !== task.status;
    const needsUpdate = mappedStatus !== task.status || sessionData.liveUrl !== outputData?.live_url;

    if (needsUpdate) {
      const updatePayload: Record<string, any> = {
        status: mappedStatus,
        output_data: {
          ...outputData,
          live_url: sessionData.liveUrl || outputData?.live_url,
          output: sessionData.output || outputData?.output,
        },
      };

      if (isTerminal) {
        updatePayload.completed_at = new Date().toISOString();
        if (sessionData.status === 'error' || sessionData.status === 'timed_out') {
          updatePayload.error_message = sessionData.status === 'timed_out' 
            ? 'Session timed out' 
            : 'Session encountered an error';
        }
      }

      await supabaseClient
        .from('tasks')
        .update(updatePayload)
        .eq('id', taskId);
    }

    // Return updated task
    const { data: updatedTask } = await supabaseClient
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    return new Response(JSON.stringify(updatedTask || task), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[POLL-SESSION] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
