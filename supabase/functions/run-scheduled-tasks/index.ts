import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";
import { BROWSER_USE_API_URL, MODELS, fetchWithTimeout, TIMEOUT_DEFAULT_MS, isAbortError } from "../_shared/config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[RUN-SCHEDULED] Cron trigger received');

    // Protect against unauthorized triggers — only pg_cron (which knows the secret) may call.
    const cronSecret = req.headers.get('x-cron-secret');
    const expected = Deno.env.get('CRON_SECRET');
    if (!expected || cronSecret !== expected) {
      console.warn('[RUN-SCHEDULED] Rejected: missing/invalid x-cron-secret');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const browserUseApiKey = Deno.env.get('BROWSER_USE_API_KEY');
    if (!browserUseApiKey) {
      console.error('[RUN-SCHEDULED] BROWSER_USE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // -------- Stuck task sweep --------
    // Any 'running' task older than 30 minutes is considered stuck (webhook likely missed).
    // Poll Browser Use once for real status; if still not terminal, mark as failed.
    try {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: stuckTasks } = await supabase
        .from('tasks')
        .select('id, output_data, user_id, started_at')
        .eq('status', 'running')
        .lt('started_at', cutoff)
        .limit(25);

      for (const t of stuckTasks ?? []) {
        const buId = (t.output_data as any)?.browser_use_task_id;
        let realStatus: string | null = null;
        let realOutput: any = null;
        if (buId) {
          try {
            const r = await fetchWithTimeout(
              `${BROWSER_USE_API_URL}/sessions/${buId}`,
              { headers: { 'X-Browser-Use-API-Key': browserUseApiKey } },
              TIMEOUT_DEFAULT_MS,
            );
            if (r.ok) {
              const j = await r.json();
              realStatus = j?.status ?? null;
              realOutput = j?.output ?? null;
            }
          } catch (err) {
            console.warn('[RUN-SCHEDULED] Sweep poll failed for', t.id, err);
          }
        }

        const isTerminal = realStatus === 'finished' || realStatus === 'failed' || realStatus === 'stopped';
        if (isTerminal) {
          await supabase
            .from('tasks')
            .update({
              status: realStatus === 'finished' ? 'completed' : 'failed',
              output_data: { ...(t.output_data as any), output: realOutput },
              completed_at: new Date().toISOString(),
            })
            .eq('id', t.id);
        } else {
          await supabase
            .from('tasks')
            .update({
              status: 'failed',
              error_message: 'Task timed out (no completion after 30 minutes).',
              completed_at: new Date().toISOString(),
            })
            .eq('id', t.id);
        }
      }
    } catch (sweepErr) {
      console.error('[RUN-SCHEDULED] Sweep error:', sweepErr);
    }

    // Fetch all active scheduled tasks
    const { data: scheduledTasks, error: fetchError } = await supabase
      .from('scheduled_tasks')
      .select('*')
      .eq('is_active', true);

    if (fetchError) {
      console.error('[RUN-SCHEDULED] Error fetching tasks:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch scheduled tasks' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!scheduledTasks || scheduledTasks.length === 0) {
      console.log('[RUN-SCHEDULED] No active scheduled tasks');
      return new Response(JSON.stringify({ message: 'No tasks to run', ran: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    let ranCount = 0;

    for (const scheduledTask of scheduledTasks) {
      // Simple cron check: if next_run_at is null or in the past, run it
      const shouldRun = !scheduledTask.next_run_at || new Date(scheduledTask.next_run_at) <= now;

      if (!shouldRun) {
        console.log(`[RUN-SCHEDULED] Skipping "${scheduledTask.name}" - not due yet`);
        continue;
      }

      console.log(`[RUN-SCHEDULED] Running "${scheduledTask.name}" for user ${scheduledTask.user_id}`);

      // Check user usage limits
      const { data: usageData } = await supabase.rpc('get_user_tier_and_usage', {
        p_user_id: scheduledTask.user_id
      });

      const usage = usageData?.[0];
      if (usage && usage.browser_tasks_used >= usage.browser_tasks_limit) {
        console.log(`[RUN-SCHEDULED] User ${scheduledTask.user_id} hit limit, skipping`);
        continue;
      }

      // Get browser profile if set
      let browserUseProfileId = null;
      if (scheduledTask.profile_id) {
        const { data: profile } = await supabase
          .from('browser_profiles')
          .select('browser_use_profile_id')
          .eq('id', scheduledTask.profile_id)
          .single();
        browserUseProfileId = profile?.browser_use_profile_id || null;
      }

      // Create task record
      const { data: taskRecord, error: taskError } = await supabase
        .from('tasks')
        .insert({
          user_id: scheduledTask.user_id,
          task_type: 'scheduled_browser_automation',
          status: 'pending',
          input_data: { 
            task: scheduledTask.prompt,
            scheduled_task_id: scheduledTask.id,
            scheduled_task_name: scheduledTask.name,
          },
        })
        .select()
        .single();

      if (taskError || !taskRecord) {
        console.error(`[RUN-SCHEDULED] Failed to create task record for "${scheduledTask.name}":`, taskError);
        continue;
      }

      // Launch browser task
      try {
        // Polling handles status updates; no webhook URL needed

        const response = await fetchWithTimeout(`${BROWSER_USE_API_URL}/sessions`, {
          method: 'POST',
          headers: {
            'X-Browser-Use-API-Key': browserUseApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            task: scheduledTask.prompt,
            model: MODELS.BROWSER_USE,
            ...(browserUseProfileId ? { profileId: browserUseProfileId } : {}),
          }),
        }, TIMEOUT_DEFAULT_MS);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[RUN-SCHEDULED] Browser Use API error for "${scheduledTask.name}":`, errorText);
          await supabase
            .from('tasks')
            .update({ status: 'failed', error_message: errorText, completed_at: now.toISOString() })
            .eq('id', taskRecord.id);
          continue;
        }

        const browserData = await response.json();

        await supabase
          .from('tasks')
          .update({
            status: 'running',
            started_at: now.toISOString(),
            output_data: {
              browser_use_task_id: browserData.id,
              live_url: browserData.liveUrl || browserData.live_url,
            },
          })
          .eq('id', taskRecord.id);

        // Track usage
        await supabase.from('usage_tracking').insert({
          user_id: scheduledTask.user_id,
          usage_type: 'browser_task',
          quantity: 1,
          task_id: taskRecord.id,
        });

        // Calculate next run time based on cron expression
        const nextRun = calculateNextRun(scheduledTask.cron_expression, now);

        await supabase
          .from('scheduled_tasks')
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRun.toISOString(),
            run_count: (scheduledTask.run_count || 0) + 1,
            updated_at: now.toISOString(),
          })
          .eq('id', scheduledTask.id);

        ranCount++;
        console.log(`[RUN-SCHEDULED] Successfully launched "${scheduledTask.name}"`);
      } catch (err) {
        const message = isAbortError(err) ? 'Browser Use request timed out' : (err instanceof Error ? err.message : 'Unknown error');
        console.error(`[RUN-SCHEDULED] Error launching "${scheduledTask.name}":`, err);
        await supabase
          .from('tasks')
          .update({
            status: 'failed',
            error_message: message,
            completed_at: now.toISOString(),
          })
          .eq('id', taskRecord.id);
      }
    }

    return new Response(JSON.stringify({ message: `Processed scheduled tasks`, ran: ranCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[RUN-SCHEDULED] Fatal error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Simple next-run calculator based on common cron patterns.
 * Handles presets; for custom cron, defaults to +1 hour.
 */
function calculateNextRun(cron: string, from: Date): Date {
  const next = new Date(from);

  switch (cron) {
    case '0 * * * *': // Every hour
      next.setHours(next.getHours() + 1, 0, 0, 0);
      break;
    case '0 */6 * * *': // Every 6 hours
      next.setHours(next.getHours() + 6, 0, 0, 0);
      break;
    case '0 9 * * *': // Daily at 9 AM
      next.setDate(next.getDate() + 1);
      next.setHours(9, 0, 0, 0);
      break;
    case '0 9 * * 1-5': // Weekdays at 9 AM
      do {
        next.setDate(next.getDate() + 1);
      } while (next.getDay() === 0 || next.getDay() === 6);
      next.setHours(9, 0, 0, 0);
      break;
    case '0 9 * * 1': // Weekly Monday at 9 AM
      do {
        next.setDate(next.getDate() + 1);
      } while (next.getDay() !== 1);
      next.setHours(9, 0, 0, 0);
      break;
    case '0 9 1 * *': // Monthly 1st at 9 AM
      next.setMonth(next.getMonth() + 1, 1);
      next.setHours(9, 0, 0, 0);
      break;
    default: // Fallback: +1 hour
      next.setHours(next.getHours() + 1, 0, 0, 0);
      break;
  }

  return next;
}
