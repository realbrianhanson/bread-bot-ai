import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";
import { BROWSER_USE_API_URL, fetchWithTimeout, TIMEOUT_DEFAULT_MS } from "../_shared/config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/** Constant-time string comparison to avoid timing attacks on the shared secret. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function fetchAndStoreScreenshots(
  browserUseTaskId: string,
  apiKey: string,
  supabaseTaskId: string,
  supabaseClient: any,
) {
  try {
    const response = await fetchWithTimeout(`${BROWSER_USE_API_URL}/sessions/${browserUseTaskId}/files`, {
      headers: { 'X-Browser-Use-API-Key': apiKey },
    }, TIMEOUT_DEFAULT_MS);

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

        const { data: signedUrlData, error: signedUrlError } = await supabaseClient.storage
          .from('browser-screenshots')
          .createSignedUrl(fileName, 3600);

        if (signedUrlError || !signedUrlData?.signedUrl) {
          console.error('Failed to create signed URL:', signedUrlError);
          continue;
        }
        screenshotUrls.push(signedUrlData.signedUrl);
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
    // Verify shared secret via header (constant-time comparison).
    const secret = req.headers.get('x-webhook-secret') || '';
    const expectedSecret = Deno.env.get('WEBHOOK_SECRET') || '';

    if (!expectedSecret || !timingSafeEqual(secret, expectedSecret)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    const body = await req.json();

    // Handle test events from Browser Use Cloud
    if (body.type === 'test') {
      console.log('[WEBHOOK] Test event received');
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Support both Browser Use Cloud event format and flat format
    let task_id: string | undefined;
    let status: string | undefined;
    let output: any;
    let steps: any;
    let live_url: string | undefined;
    let taskError: string | undefined;

    if (body.type && body.payload) {
      // Browser Use Cloud event format
      task_id = body.payload.session_id || body.payload.task_id;
      status = body.payload.status;
      output = body.payload.output;
      steps = body.payload.steps;
      live_url = body.payload.live_url;
      taskError = body.payload.error;
    } else {
      // Flat format (backward compat)
      task_id = body.task_id;
      status = body.status;
      output = body.output;
      steps = body.steps;
      live_url = body.live_url;
      taskError = body.error;
    }

    console.log('[WEBHOOK] Received:', { type: body.type, task_id, status });

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
      .select('id, output_data, user_id, status')
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
    const previousStatus: string = task.status || 'pending';
    const TERMINAL = new Set(['completed', 'failed', 'stopped', 'cancelled']);

    // Map status
    const mappedStatus = status === 'finished' ? 'completed'
      : status === 'failed' ? 'failed'
      : status === 'paused' ? 'paused'
      : 'running';

    // If the task is already in a terminal state, treat this as a duplicate delivery
    // and skip re-uploading screenshots / re-dispatching user webhooks.
    if (TERMINAL.has(previousStatus)) {
      console.log('[WEBHOOK] Duplicate delivery for terminal task, skipping:', task.id, previousStatus);
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Fetch screenshots on finish (only when transitioning into terminal state).
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
        await fetchWithTimeout(dispatchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'x-webhook-secret': Deno.env.get('WEBHOOK_SECRET') ?? '',
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
        }, TIMEOUT_DEFAULT_MS);
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
