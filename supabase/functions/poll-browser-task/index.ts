import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";

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

    const outputData = (task.output_data as Record<string, any>) || {};
    const browserUseTaskId = outputData?.browser_use_task_id;

    if (!browserUseTaskId) {
      return new Response(JSON.stringify({ task, changed: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If task is already terminal, just return
    if (['completed', 'failed', 'stopped'].includes(task.status)) {
      return new Response(JSON.stringify({ task, changed: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine API key (same logic as browser-task)
    let browserUseApiKey: string;
    const { data: usageData } = await supabaseClient.rpc('get_user_tier_and_usage', {
      p_user_id: user.id
    });
    const usage = usageData?.[0];

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
      console.error('[POLL-BROWSER-TASK] API error:', errText);
      return new Response(JSON.stringify({ error: 'Failed to poll session', details: errText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sessionData = await sessionResponse.json();
    console.log('[POLL-BROWSER-TASK] Session status:', sessionData.status, 'for task:', taskId);

    // Map Browser Use v3 status to our status
    // v3 statuses: created, idle, running, stopped, timed_out, error
    // NOTE: Browser Use Cloud returns "stopped" when the agent naturally finishes
    // (e.g. task complete, session timeout). This is NOT the same as user-initiated stop.
    // We treat "stopped" with output as "completed".
    let mappedStatus = task.status;
    const buStatus = sessionData.status?.toLowerCase();
    if (buStatus === 'finished' || buStatus === 'completed' || buStatus === 'done' || buStatus === 'idle') {
      // idle after running means finished
      if (task.status === 'running' || task.status === 'pending') {
        mappedStatus = 'completed';
      }
    } else if (buStatus === 'failed' || buStatus === 'error' || buStatus === 'timed_out') {
      mappedStatus = 'failed';
    } else if (buStatus === 'stopped' || buStatus === 'cancelled') {
      // If there's meaningful output, the agent finished its work — treat as completed
      const hasOutput = sessionData.output && sessionData.output.trim().length > 0;
      if (hasOutput && task.status === 'running') {
        mappedStatus = 'completed';
        console.log('[POLL-BROWSER-TASK] Session stopped with output — treating as completed');
      } else {
        mappedStatus = 'stopped';
      }
    } else if (buStatus === 'paused') {
      mappedStatus = 'paused';
    } else if (buStatus === 'running' || buStatus === 'created') {
      mappedStatus = 'running';
    }

    const statusChanged = mappedStatus !== task.status;
    const liveUrlChanged = sessionData.liveUrl && sessionData.liveUrl !== outputData?.live_url;

    if (statusChanged || liveUrlChanged) {
      const updatePayload: Record<string, any> = {
        status: mappedStatus,
        output_data: {
          ...outputData,
          live_url: sessionData.liveUrl || outputData?.live_url,
          output: sessionData.output || outputData?.output,
        },
      };

      if (['completed', 'failed', 'stopped'].includes(mappedStatus) && mappedStatus !== task.status) {
        updatePayload.completed_at = new Date().toISOString();
        if (buStatus === 'error' || buStatus === 'timed_out' || buStatus === 'failed') {
          updatePayload.error_message = buStatus === 'timed_out'
            ? 'Session timed out'
            : sessionData.error || 'Session encountered an error';
        }
      }

      await supabaseClient
        .from('tasks')
        .update(updatePayload)
        .eq('id', taskId);

      // On completion, fetch screenshots
      if (mappedStatus === 'completed') {
        try {
          const filesResponse = await fetch(`${BROWSER_USE_API_URL}/sessions/${browserUseTaskId}/files?includeUrls=true`, {
            headers: { 'X-Browser-Use-API-Key': browserUseApiKey },
          });

          if (filesResponse.ok) {
            const filesData = await filesResponse.json();
            const files = filesData?.files || [];
            const screenshotUrls: string[] = [];

            for (let i = 0; i < files.length && i < 10; i++) {
              const file = files[i];
              if (!file.url) continue;
              try {
                const imgResponse = await fetch(file.url);
                if (!imgResponse.ok) continue;
                const imageBlob = await imgResponse.blob();
                const fileName = `${taskId}/screenshot-${i}.png`;

                const { error: uploadError } = await supabaseClient.storage
                  .from('browser-screenshots')
                  .upload(fileName, imageBlob, { contentType: 'image/png', upsert: true });

                if (!uploadError) {
                  const { data: { publicUrl } } = supabaseClient.storage
                    .from('browser-screenshots')
                    .getPublicUrl(fileName);
                  screenshotUrls.push(publicUrl);
                }
              } catch (e) {
                console.error('[POLL-BROWSER-TASK] Screenshot upload error:', e);
              }
            }

            if (screenshotUrls.length > 0) {
              await supabaseClient
                .from('tasks')
                .update({ screenshots: screenshotUrls })
                .eq('id', taskId);
            }
          }
        } catch (e) {
          console.error('[POLL-BROWSER-TASK] Error fetching screenshots:', e);
        }
      }

      // On completion or failure, dispatch user webhooks
      if (mappedStatus === 'completed' || mappedStatus === 'failed') {
        const webhookEvent = mappedStatus === 'completed' ? 'task.completed' : 'task.failed';
        try {
          const dispatchUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/dispatch-webhook`;
          await fetch(dispatchUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({
              userId: user.id,
              event: webhookEvent,
              taskData: {
                taskId: taskId,
                browserUseTaskId,
                status: mappedStatus,
                description: sessionData.output || updatePayload.error_message || 'Task event',
              },
            }),
          });
          console.log('[POLL-BROWSER-TASK] Dispatched webhooks for:', webhookEvent);
        } catch (dispatchErr) {
          console.error('[POLL-BROWSER-TASK] Webhook dispatch error:', dispatchErr);
        }
      }
    }

    return new Response(JSON.stringify({ task: { ...task, status: mappedStatus }, changed: statusChanged || liveUrlChanged }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[POLL-BROWSER-TASK] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
