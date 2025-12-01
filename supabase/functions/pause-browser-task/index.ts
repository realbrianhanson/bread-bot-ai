import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { taskId } = await req.json();
    if (!taskId) {
      throw new Error('Task ID is required');
    }

    console.log('Pausing browser task:', taskId);

    // Get task details to find Browser Use task ID
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

    // Get API key
    const browserUseApiKey = Deno.env.get('BROWSER_USE_API_KEY');
    if (!browserUseApiKey) {
      throw new Error('Browser Use API key not configured');
    }

    // Call Browser Use API to pause task
    const pauseResponse = await fetch(
      `https://api.browser-use.com/api/v1/pause-task?task_id=${browserUseTaskId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${browserUseApiKey}`,
        },
      }
    );

    if (!pauseResponse.ok) {
      const errorText = await pauseResponse.text();
      console.error('Failed to pause task:', errorText);
      throw new Error(`Failed to pause task: ${errorText}`);
    }

    // Update task status in database
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
