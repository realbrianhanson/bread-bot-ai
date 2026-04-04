import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const toolDefinitions = [
  {
    name: 'browse_web',
    description: 'Use a real browser to interact with a website — click buttons, fill forms, navigate pages, take screenshots. Use when the task requires human-like browser interaction (logging in, submitting forms, navigating SPAs).',
    input_schema: {
      type: 'object' as const,
      properties: {
        task: { type: 'string', description: 'Detailed natural-language instruction for the browser agent' },
      },
      required: ['task'],
    },
  },
  {
    name: 'scrape_url',
    description: 'Extract the text/markdown content from a specific URL. Fast and lightweight — use when you already know the exact URL and just need its content.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'The URL to scrape' },
        formats: {
          type: 'array',
          items: { type: 'string', enum: ['markdown', 'html', 'links', 'screenshot'] },
          description: 'Output formats. Defaults to ["markdown"].',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'crawl_site',
    description: 'Recursively crawl an entire website or section of it. Use for gathering content across many pages of the same domain.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'Root URL to start crawling' },
        limit: { type: 'number', description: 'Max pages to crawl. Default 20.' },
        maxDepth: { type: 'number', description: 'Max link depth. Default 3.' },
      },
      required: ['url'],
    },
  },
  {
    name: 'search_web',
    description: 'Search the web for a topic and return a list of relevant URLs with snippets. Use as the first step when the user wants research or doesn\'t provide a specific URL.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Number of results. Default 5.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'synthesize',
    description: 'Process, analyze, summarize, or combine previously gathered data into a polished final output. Always call this as the last step to produce the user-facing result.',
    input_schema: {
      type: 'object' as const,
      properties: {
        instruction: { type: 'string', description: 'What to do with the data — summarize, compare, extract insights, write a report, etc.' },
        data: { type: 'string', description: 'The raw data/content to process (from previous tool results)' },
      },
      required: ['instruction', 'data'],
    },
  },
  {
    name: 'generate_file',
    description: 'Generate a downloadable file (PDF, CSV, etc.) from the provided content. Currently a stub — returns a placeholder.',
    input_schema: {
      type: 'object' as const,
      properties: {
        filename: { type: 'string', description: 'Desired filename with extension' },
        content: { type: 'string', description: 'Content to put in the file' },
        format: { type: 'string', enum: ['pdf', 'csv', 'json', 'txt', 'html'], description: 'File format' },
      },
      required: ['filename', 'content', 'format'],
    },
  },
];

const SYSTEM_PROMPT = `You are an AI task orchestrator. Given a user's request, determine which tools to use and in what order to fulfill the request completely.

Guidelines:
- For research tasks: search_web first to find sources, then scrape_url on the best 2-3 results, then synthesize into a polished report.
- For browser interaction tasks (login, form filling, clicking): use browse_web.
- For extracting data from a known URL: use scrape_url.
- For mapping an entire site: use crawl_site.
- Always end with synthesize to produce a polished, well-formatted final output for the user.
- Chain multiple tools when needed — you can call tools sequentially.
- Be efficient: don't scrape more pages than necessary.
- When synthesizing, produce rich markdown output with clear headings, bullet points, and structure.`;

async function resolveAnthropicKey(
  supabaseClient: any,
  userId: string,
  canUseOwnKeys: boolean,
): Promise<string> {
  if (canUseOwnKeys) {
    const { data: apiKeyData } = await supabaseClient
      .from('api_keys')
      .select('encrypted_key')
      .eq('user_id', userId)
      .eq('provider', 'anthropic')
      .eq('is_active', true)
      .maybeSingle();

    if (apiKeyData?.encrypted_key) return apiKeyData.encrypted_key;
  }
  return Deno.env.get('ANTHROPIC_API_KEY') ?? '';
}

async function executeTool(
  toolName: string,
  toolInput: any,
  supabaseUrl: string,
  authToken: string,
  anthropicApiKey: string,
): Promise<string> {
  console.log(`[ORCHESTRATE] Executing tool: ${toolName}`, JSON.stringify(toolInput).slice(0, 200));

  try {
    switch (toolName) {
      case 'search_web': {
        const res = await fetch(`${supabaseUrl}/functions/v1/firecrawl-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ query: toolInput.query, options: { limit: toolInput.limit || 5 } }),
        });
        const data = await res.json();
        if (!data.success && data.error) return `Error: ${data.error}`;
        const results = data.data || [];
        return JSON.stringify(results.map((r: any) => ({
          url: r.url, title: r.title, description: r.description,
          markdown: r.markdown?.slice(0, 2000),
        })));
      }

      case 'scrape_url': {
        const res = await fetch(`${supabaseUrl}/functions/v1/firecrawl-scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ url: toolInput.url, options: { formats: toolInput.formats || ['markdown'] } }),
        });
        const data = await res.json();
        if (!data.success && data.error) return `Error: ${data.error}`;
        const markdown = data.data?.markdown || data.markdown || '';
        return markdown.slice(0, 15000);
      }

      case 'crawl_site': {
        const res = await fetch(`${supabaseUrl}/functions/v1/firecrawl-crawl`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({
            url: toolInput.url,
            options: { limit: toolInput.limit || 20, maxDepth: toolInput.maxDepth || 3 },
          }),
        });
        const data = await res.json();
        if (!data.success && data.error) return `Error: ${data.error}`;
        return JSON.stringify(data).slice(0, 15000);
      }

      case 'browse_web': {
        const res = await fetch(`${supabaseUrl}/functions/v1/browser-task`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ task: toolInput.task }),
        });
        const data = await res.json();
        if (data.error) return `Error: ${data.error}`;
        return JSON.stringify({ taskId: data.taskId, status: data.status, liveUrl: data.liveUrl });
      }

      case 'synthesize': {
        const synthResponse = await fetch(ANTHROPIC_API_URL, {
          method: 'POST',
          headers: {
            'x-api-key': anthropicApiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 8192,
            messages: [{
              role: 'user',
              content: `${toolInput.instruction}\n\nHere is the data to work with:\n\n${toolInput.data}`,
            }],
          }),
        });
        if (!synthResponse.ok) {
          const errText = await synthResponse.text();
          return `Synthesis error: ${errText}`;
        }
        const synthData = await synthResponse.json();
        return synthData.content?.[0]?.text || 'No synthesis output';
      }

      case 'generate_file': {
        const res = await fetch(`${supabaseUrl}/functions/v1/generate-file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({
            type: toolInput.format || 'docx',
            content: toolInput.content,
            title: toolInput.filename,
            filename: toolInput.filename.replace(/\.[^.]+$/, '') || toolInput.filename,
          }),
        });
        const data = await res.json();
        if (data.error) return `Error: ${data.error}`;
        return JSON.stringify({ success: true, fileUrl: data.fileUrl, filename: data.filename, size: data.size });
      }

      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (error) {
    console.error(`[ORCHESTRATE] Tool ${toolName} failed:`, error);
    return `Tool execution error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[ORCHESTRATE] User:', user.id);

    // --- Usage limits ---
    const { data: usageData } = await supabaseClient.rpc('get_user_tier_and_usage', { p_user_id: user.id });
    const usage = usageData?.[0];
    if (!usage) {
      return new Response(JSON.stringify({ error: 'Unable to fetch usage data' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (usage.chat_messages_used >= usage.chat_messages_limit) {
      return new Response(JSON.stringify({
        error: `Monthly limit of ${usage.chat_messages_limit} messages reached. Please upgrade.`,
        limit_exceeded: true,
      }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- API key ---
    const anthropicApiKey = await resolveAnthropicKey(supabaseClient, user.id, usage.can_use_own_keys);
    if (!anthropicApiKey) {
      return new Response(JSON.stringify({ error: 'Anthropic API key not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Parse request ---
    const { message, projectId, conversationHistory } = await req.json();
    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Create task record ---
    const { data: taskRecord, error: taskError } = await supabaseClient
      .from('tasks')
      .insert({
        user_id: user.id,
        project_id: projectId || null,
        task_type: 'orchestrated',
        status: 'running',
        started_at: new Date().toISOString(),
        input_data: { message },
      })
      .select()
      .single();

    if (taskError || !taskRecord) {
      return new Response(JSON.stringify({ error: 'Failed to create task record' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Orchestration loop ---
    const messages: any[] = [];

    // Include recent conversation context if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-6)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: 'user', content: message });

    const executionLog: any[] = [];
    const MAX_ITERATIONS = 10;
    let finalResult = '';

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      console.log(`[ORCHESTRATE] Iteration ${i + 1}`);

      const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: 8192,
          system: SYSTEM_PROMPT,
          tools: toolDefinitions,
          messages,
        }),
      });

      if (!anthropicResponse.ok) {
        const errText = await anthropicResponse.text();
        console.error('[ORCHESTRATE] Anthropic error:', anthropicResponse.status, errText);

        await supabaseClient.from('tasks').update({
          status: 'failed',
          error_message: `Anthropic API error: ${anthropicResponse.status}`,
          completed_at: new Date().toISOString(),
          output_data: { execution_log: executionLog },
        }).eq('id', taskRecord.id);

        return new Response(JSON.stringify({ error: 'AI orchestration failed' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = await anthropicResponse.json();
      const stopReason = result.stop_reason;

      // Append assistant message
      messages.push({ role: 'assistant', content: result.content });

      // If the model is done (no more tool calls), extract final text
      if (stopReason === 'end_turn' || stopReason !== 'tool_use') {
        for (const block of result.content) {
          if (block.type === 'text') {
            finalResult += block.text;
          }
        }
        break;
      }

      // Execute each tool_use block
      const toolResults: any[] = [];
      for (const block of result.content) {
        if (block.type !== 'tool_use') continue;

        const toolResult = await executeTool(
          block.name,
          block.input,
          supabaseUrl,
          token,
          anthropicApiKey,
        );

        executionLog.push({
          tool: block.name,
          input: block.input,
          output_preview: toolResult.slice(0, 500),
          timestamp: new Date().toISOString(),
        });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: toolResult,
        });
      }

      // Feed tool results back to Claude
      messages.push({ role: 'user', content: toolResults });
    }

    // --- Finalize ---
    await supabaseClient.from('tasks').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      output_data: {
        result: finalResult,
        execution_log: executionLog,
        tools_used: executionLog.map((e: any) => e.tool),
      },
    }).eq('id', taskRecord.id);

    // Track usage
    await supabaseClient.from('usage_tracking').insert({
      user_id: user.id,
      usage_type: 'chat_message',
      quantity: 1,
      task_id: taskRecord.id,
    });

    return new Response(JSON.stringify({
      taskId: taskRecord.id,
      result: finalResult,
      toolsUsed: executionLog.map((e: any) => e.tool),
      executionLog,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[ORCHESTRATE] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
