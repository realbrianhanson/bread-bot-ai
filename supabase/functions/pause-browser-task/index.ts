import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { taskId } = await req.json();
    if (!taskId) {
      throw new Error('Task ID is required');
    }

    console.log('Pausing browser task:', taskId);

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (taskError || !task) {
      throw new Error('Task not found');
    }

    const outputData = task.output_data as any;
    const browserUseTaskId = outputData?.browser_use_task_id;

    if (!browserUseTaskId) {
      throw new Error('Browser Use task ID not found');
    }

    const browserUseApiKey = Deno.env.get('BROWSER_USE_API_KEY');
    if (!browserUseApiKey) {
      throw new Error('Browser Use API key not configured');
    }

    const pauseResponse = await fetch(
      `https://api.browser-use.com/api/v3/sessions/${browserUseTaskId}/stop`,
      {
        method: 'POST',
        headers: {
          'X-Browser-Use-API-Key': browserUseApiKey,
        },
      }
    );

    if (!pauseResponse.ok) {
      const errorText = await pauseResponse.text();
      console.error('Failed to pause task:', errorText);
      throw new Error(`Failed to pause task: ${errorText}`);
    }

    const { error: updateError } = await supabase
      .from('tasks')
      .update({ 
        status: 'paused',
        output_data: {
          ...outputData,
          paused_at: new Date().toISOString(),
        }
      })
      .eq('id', taskId);

    if (updateError) {
      console.error('Failed to update task status:', updateError);
      throw updateError;
    }

    console.log('Task paused successfully:', taskId);

    return new Response(
      JSON.stringify({ success: true, taskId }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error pausing task:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
