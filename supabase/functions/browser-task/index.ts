import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BROWSER_USE_API_URL = 'https://api.browser-use.com/api/v1';

async function pollTaskStatus(
  browserUseTaskId: string,
  apiKey: string,
  supabaseTaskId: string,
  supabaseClient: any,
  userId: string
) {
  const maxAttempts = 60; // Poll for up to 2 minutes
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      // Get task details from Browser Use
      const response = await fetch(`${BROWSER_USE_API_URL}/task/${browserUseTaskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!response.ok) {
        console.error('Failed to fetch task status:', await response.text());
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
        continue;
      }

      const taskData = await response.json();
      console.log('Task status:', taskData.status);

      // Update database with current status and steps
      await supabaseClient
        .from('tasks')
        .update({
          status: taskData.status === 'finished' ? 'completed' : 
                  taskData.status === 'failed' ? 'failed' : 'running',
          output_data: {
            output: taskData.output,
            steps: taskData.steps || [],
            actions: taskData.steps?.map((step: any) => ({
              type: step.action,
              timestamp: step.timestamp,
              description: step.description,
            })) || [],
          },
          error_message: taskData.error || null,
        })
        .eq('id', supabaseTaskId);

      // If task is finished, fetch screenshots
      if (taskData.status === 'finished' || taskData.status === 'failed' || taskData.status === 'stopped') {
        if (taskData.status === 'finished') {
          await fetchAndStoreScreenshots(browserUseTaskId, apiKey, supabaseTaskId, supabaseClient, userId);
        }

        await supabaseClient
          .from('tasks')
          .update({
            completed_at: new Date().toISOString(),
          })
          .eq('id', supabaseTaskId);

        console.log('Task completed:', supabaseTaskId);
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    } catch (error) {
      console.error('Error polling task:', error);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  if (attempts >= maxAttempts) {
    console.error('Task polling timeout');
    await supabaseClient
      .from('tasks')
      .update({
        status: 'failed',
        error_message: 'Task polling timeout',
        completed_at: new Date().toISOString(),
      })
      .eq('id', supabaseTaskId);
  }
}

async function fetchAndStoreScreenshots(
  browserUseTaskId: string,
  apiKey: string,
  supabaseTaskId: string,
  supabaseClient: any,
  userId: string
) {
  try {
    // Fetch screenshots from Browser Use
    const response = await fetch(`${BROWSER_USE_API_URL}/task/${browserUseTaskId}/screenshots`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      console.error('Failed to fetch screenshots:', await response.text());
      return;
    }

    const { screenshots } = await response.json();
    console.log('Found screenshots:', screenshots?.length || 0);

    if (!screenshots || screenshots.length === 0) {
      return;
    }

    const screenshotUrls: string[] = [];

    // Download and store each screenshot
    for (let i = 0; i < screenshots.length; i++) {
      const screenshotUrl = screenshots[i];
      try {
        const imgResponse = await fetch(screenshotUrl);
        if (!imgResponse.ok) continue;

        const imageBlob = await imgResponse.blob();
        const fileName = `${supabaseTaskId}/screenshot-${i}.png`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('browser-screenshots')
          .upload(fileName, imageBlob, {
            contentType: 'image/png',
            upsert: true,
          });

        if (uploadError) {
          console.error('Failed to upload screenshot:', uploadError);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseClient.storage
          .from('browser-screenshots')
          .getPublicUrl(fileName);

        screenshotUrls.push(publicUrl);
      } catch (error) {
        console.error('Error processing screenshot:', error);
      }
    }

    // Update task with screenshot URLs
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
    const apiKey = apiKeyData.encrypted_key;

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

    // Call Browser Use Cloud API
    try {
      const browserUseResponse = await fetch(`${BROWSER_USE_API_URL}/run-task`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task }),
      });

      if (!browserUseResponse.ok) {
        const errorText = await browserUseResponse.text();
        console.error('Browser Use API error:', errorText);
        
        await supabaseClient
          .from('tasks')
          .update({
            status: 'failed',
            error_message: `Browser Use API error: ${errorText}`,
            completed_at: new Date().toISOString(),
          })
          .eq('id', taskRecord.id);

        return new Response(JSON.stringify({ 
          error: 'Failed to create Browser Use task',
          details: errorText 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const browserUseData = await browserUseResponse.json();
      const browserUseTaskId = browserUseData.id;

      console.log('Browser Use task created:', browserUseTaskId);

      // Update task with Browser Use task ID and set to running
      await supabaseClient
        .from('tasks')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
          output_data: { browser_use_task_id: browserUseTaskId },
        })
        .eq('id', taskRecord.id);

      // Start background polling (don't await)
      pollTaskStatus(browserUseTaskId, apiKey, taskRecord.id, supabaseClient, user.id);

      return new Response(JSON.stringify({
        taskId: taskRecord.id,
        browserUseTaskId,
        status: 'running',
        message: 'Browser automation task started',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error calling Browser Use API:', error);
      
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
    console.error('Error in browser-task function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});