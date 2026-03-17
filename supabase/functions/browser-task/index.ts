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
    console.log('[BROWSER-TASK] Request received');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized - No auth header' }), {
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
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[BROWSER-TASK] User authenticated:', user.id);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check user's tier and usage limits
    const { data: usageData } = await supabaseClient.rpc('get_user_tier_and_usage', {
      p_user_id: user.id
    });

    const usage = usageData?.[0];
    if (!usage) {
      return new Response(JSON.stringify({ error: 'Unable to fetch usage data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (usage.browser_tasks_used >= usage.browser_tasks_limit) {
      return new Response(JSON.stringify({
        error: `You've reached your monthly limit of ${usage.browser_tasks_limit} browser tasks. Please upgrade your plan to continue.`,
        limit_exceeded: true
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine API key
    let browserUseApiKey: string;

    if (usage.can_use_own_keys) {
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

    const { task, projectId, profileId } = await req.json();

    // Get browser profile if provided
    let browserUseProfileId = null;
    if (profileId) {
      const { data: profile } = await supabaseClient
        .from('browser_profiles')
        .select('browser_use_profile_id')
        .eq('id', profileId)
        .eq('user_id', user.id)
        .single();

      if (profile?.browser_use_profile_id) {
        browserUseProfileId = profile.browser_use_profile_id;
        await supabaseClient
          .from('browser_profiles')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', profileId);
      }
    }

    // Create task record
    const { data: taskRecord, error: taskError } = await supabaseClient
      .from('tasks')
      .insert({
        user_id: user.id,
        project_id: projectId,
        task_type: 'browser_automation',
        status: 'pending',
        input_data: { task },
      })
      .select()
      .single();

    if (taskError || !taskRecord) {
      return new Response(JSON.stringify({ error: 'Failed to create task record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call Browser Use Cloud API
    try {

      const browserUseResponse = await fetch(`${BROWSER_USE_API_URL}/sessions`, {
        method: 'POST',
        headers: {
          'X-Browser-Use-API-Key': browserUseApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task,
          ...(browserUseProfileId ? { profileId: browserUseProfileId } : {})
        }),
      });

      if (!browserUseResponse.ok) {
        const errorText = await browserUseResponse.text();
        await supabaseClient
          .from('tasks')
          .update({
            status: 'failed',
            error_message: `Browser Use API error: ${errorText}`,
            completed_at: new Date().toISOString(),
          })
          .eq('id', taskRecord.id);

        return new Response(JSON.stringify({ error: 'Failed to create Browser Use task', details: errorText }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const browserUseData = await browserUseResponse.json();
      console.log('[BROWSER-TASK] Full API response:', JSON.stringify(browserUseData));
      const browserUseTaskId = browserUseData.id;
      const liveUrl = browserUseData.liveUrl || browserUseData.live_url;

      console.log('[BROWSER-TASK] Task created:', browserUseTaskId, 'Live URL:', liveUrl);

      // Update task record
      await supabaseClient
        .from('tasks')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
          output_data: {
            browser_use_task_id: browserUseTaskId,
            live_url: liveUrl
          },
        })
        .eq('id', taskRecord.id);

      // Track usage
      await supabaseClient
        .from('usage_tracking')
        .insert({
          user_id: user.id,
          usage_type: 'browser_task',
          quantity: 1,
          task_id: taskRecord.id
        });

      return new Response(JSON.stringify({
        taskId: taskRecord.id,
        browserUseTaskId,
        liveUrl,
        status: 'running',
        message: 'Browser automation task started',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      await supabaseClient
        .from('tasks')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskRecord.id);

      return new Response(JSON.stringify({
        error: 'Failed to start browser automation',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
