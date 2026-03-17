import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BROWSER_USE_API_URL = 'https://api.browser-use.com/api/v3';

async function fetchAndStoreScreenshots(
  browserUseTaskId: string,
  apiKey: string,
  supabaseTaskId: string,
  supabaseClient: any,
) {
  try {
    const response = await fetch(`${BROWSER_USE_API_URL}/sessions/${browserUseTaskId}/files`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      console.error('Failed to fetch screenshots:', await response.text());
      return;
    }

    const { screenshots } = await response.json();
    if (!screenshots || screenshots.length === 0) return;

    const screenshotUrls: string[] = [];

    for (let i = 0; i < screenshots.length; i++) {
      try {
        const imgResponse = await fetch(screenshots[i]);
        if (!imgResponse.ok) continue;

        const imageBlob = await imgResponse.blob();
        const fileName = `${supabaseTaskId}/screenshot-${i}.png`;

        const { error: uploadError } = await supabaseClient.storage
          .from('browser-screenshots')
          .upload(fileName, imageBlob, { contentType: 'image/png', upsert: true });

        if (uploadError) {
          console.error('Failed to upload screenshot:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabaseClient.storage
          .from('browser-screenshots')
          .getPublicUrl(fileName);

        screenshotUrls.push(publicUrl);
      } catch (error) {
        console.error('Error processing screenshot:', error);
      }
    }

    if (screenshotUrls.length > 0) {
      await supabaseClient
        .from('tasks')
        .update({ screenshots: screenshotUrls })
        .eq('id', supabaseTaskId);
    }
  } catch (error) {
    console.error('Error fetching screenshots:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify shared secret
    const url = new URL(req.url);
    const secret = url.searchParams.get('secret');
    const expectedSecret = Deno.env.get('WEBHOOK_SECRET');

    if (!expectedSecret || secret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    const body = await req.json();
    const { task_id, status, output, steps, live_url, error: taskError } = body;

    console.log('[WEBHOOK] Received:', { task_id, status });

    if (!task_id) {
      return new Response(JSON.stringify({ error: 'Missing task_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Look up task by browser_use_task_id in output_data
    const { data: tasks, error: lookupError } = await supabaseClient
      .from('tasks')
      .select('id, output_data, user_id')
      .filter('output_data->>browser_use_task_id', 'eq', task_id);

    if (lookupError || !tasks || tasks.length === 0) {
      console.error('[WEBHOOK] Task not found for browser_use_task_id:', task_id, lookupError);
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const task = tasks[0];
    const currentOutputData = task.output_data || {};

    // Map status
    const mappedStatus = status === 'finished' ? 'completed'
      : status === 'failed' ? 'failed'
      : status === 'paused' ? 'paused'
      : 'running';

    const updatePayload: Record<string, any> = {
      status: mappedStatus,
      output_data: {
        ...currentOutputData,
        output,
        steps: steps || [],
        live_url: live_url || currentOutputData.live_url,
        actions: steps?.map((step: any) => ({
          type: step.action,
          timestamp: step.timestamp,
          description: step.description,
          target: step.target || null,
          status: step.status || 'completed',
        })) || [],
      },
      error_message: taskError || null,
    };

    if (status === 'finished' || status === 'failed' || status === 'stopped') {
      updatePayload.completed_at = new Date().toISOString();
    }

    await supabaseClient
      .from('tasks')
      .update(updatePayload)
      .eq('id', task.id);

    // Fetch screenshots on finish
    if (status === 'finished') {
      const apiKey = Deno.env.get('BROWSER_USE_API_KEY') ?? '';
      if (apiKey) {
        await fetchAndStoreScreenshots(task_id, apiKey, task.id, supabaseClient);
      }
    }

    // Dispatch user webhooks on completion or failure
    if (status === 'finished' || status === 'failed') {
      const webhookEvent = status === 'finished' ? 'task.completed' : 'task.failed';
      try {
        const dispatchUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/dispatch-webhook`;
        await fetch(dispatchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
          body: JSON.stringify({
            userId: task.user_id,
            event: webhookEvent,
            taskData: {
              taskId: task.id,
              browserUseTaskId: task_id,
              status: mappedStatus,
              description: output || taskError || 'Task event',
            },
          }),
        });
        console.log('[WEBHOOK] Dispatched user webhooks for event:', webhookEvent);
      } catch (dispatchErr) {
        console.error('[WEBHOOK] Failed to dispatch user webhooks:', dispatchErr);
      }
    }

    console.log('[WEBHOOK] Task updated:', task.id, '→', mappedStatus);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[WEBHOOK] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
