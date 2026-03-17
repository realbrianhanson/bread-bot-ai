import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BROWSER_USE_API_URL = 'https://api.browser-use.com/api/v3';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[RUN-SCHEDULED] Cron trigger received');

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

        const response = await fetch(`${BROWSER_USE_API_URL}/sessions`, {
          method: 'POST',
          headers: {
            'X-Browser-Use-API-Key': browserUseApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            task: scheduledTask.prompt,
            ...(browserUseProfileId ? { profileId: browserUseProfileId } : {}),
          }),
        });

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
        console.error(`[RUN-SCHEDULED] Error launching "${scheduledTask.name}":`, err);
        await supabase
          .from('tasks')
          .update({
            status: 'failed',
            error_message: err instanceof Error ? err.message : 'Unknown error',
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
