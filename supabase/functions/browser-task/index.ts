import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user's Browser Use API key
    const { data: apiKeyData, error: keyError } = await supabaseClient
      .from('api_keys')
      .select('encrypted_key')
      .eq('user_id', user.id)
      .eq('provider', 'browser_use')
      .eq('is_active', true)
      .maybeSingle();

    if (keyError || !apiKeyData) {
      return new Response(JSON.stringify({ error: 'Browser Use API key not found. Please add it in Settings.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { task, projectId } = await req.json();

    console.log('Creating browser automation task:', task);

    // Create task record in database
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
      console.error('Failed to create task record:', taskError);
      return new Response(JSON.stringify({ error: 'Failed to create task record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update task to started
    await supabaseClient
      .from('tasks')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', taskRecord.id);

    // Call Browser Use API (placeholder - replace with actual Browser Use Cloud API)
    // For now, simulate a task response
    const simulatedResponse = {
      taskId: taskRecord.id,
      status: 'running',
      message: 'Browser automation task started',
      actions: [
        { type: 'navigate', url: 'https://example.com', timestamp: new Date().toISOString() },
        { type: 'click', selector: 'button', timestamp: new Date().toISOString() },
      ],
    };

    // Update task with output
    await supabaseClient
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        output_data: simulatedResponse,
      })
      .eq('id', taskRecord.id);

    return new Response(JSON.stringify({
      ...simulatedResponse,
      taskId: taskRecord.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in browser-task function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});