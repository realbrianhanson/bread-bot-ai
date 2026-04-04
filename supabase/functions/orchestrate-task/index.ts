import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// --- Honcho helpers ---
const HONCHO_API_BASE = 'https://api.honcho.dev/v1';

async function getHonchoContext(userId: string): Promise<string> {
  const apiKey = Deno.env.get('HONCHO_API_KEY');
  const workspaceId = Deno.env.get('HONCHO_WORKSPACE_ID');
  if (!apiKey || !workspaceId) return '';

  const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

  try {
    // Get or create user peer
    await fetch(`${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/${userId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ configuration: { observe_me: true } }),
    });

    // Ensure assistant peer exists
    await fetch(`${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/assistant`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ configuration: { observe_me: false } }),
    });

    // Create a session for this orchestration
    const sessionRes = await fetch(`${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/${userId}/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ metadata: { source: 'orchestrator' } }),
    });
    const sessionData = await sessionRes.json();

    // Get context
    const contextRes = await fetch(
      `${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/${userId}/sessions/${sessionData.id}/context`,
      { method: 'POST', headers, body: JSON.stringify({ max_tokens: 2000 }) },
    );
    const contextData = await contextRes.json();
    return contextData?.context || contextData?.content || '';
  } catch (err) {
    console.error('[ORCHESTRATE] Honcho context fetch failed:', err);
    return '';
  }
}

async function storeHonchoMessages(userId: string, userMessage: string, assistantMessage: string): Promise<void> {
  const apiKey = Deno.env.get('HONCHO_API_KEY');
  const workspaceId = Deno.env.get('HONCHO_WORKSPACE_ID');
  if (!apiKey || !workspaceId) return;

  const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

  try {
    const sessionRes = await fetch(`${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/${userId}/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ metadata: { source: 'orchestrator_store' } }),
    });
    const session = await sessionRes.json();

    await fetch(`${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/${userId}/sessions/${session.id}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify([
        { peer_id: userId, content: userMessage },
        { peer_id: 'assistant', content: assistantMessage },
      ]),
    });
  } catch (err) {
    console.error('[ORCHESTRATE] Honcho store failed:', err);
  }
}

async function queryHonchoMemory(userId: string, query: string): Promise<string> {
  const apiKey = Deno.env.get('HONCHO_API_KEY');
  const workspaceId = Deno.env.get('HONCHO_WORKSPACE_ID');
  if (!apiKey || !workspaceId) return 'Memory system unavailable.';

  try {
    const res = await fetch(`${HONCHO_API_BASE}/workspaces/${workspaceId}/peers/${userId}/chat`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    return data?.response || data?.content || 'No information found about this topic.';
  } catch (err) {
    console.error('[ORCHESTRATE] Honcho query failed:', err);
    return 'Memory query failed.';
  }
}

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
    name: 'execute_code',
    description: 'Execute Python code in a secure sandbox. Use this when you need to: process or transform data (clean CSVs, merge datasets, calculate statistics), generate visualizations (charts, graphs using matplotlib/plotly), perform calculations or data analysis, convert between file formats, or run any computation that requires actual code execution. The sandbox has Python with pandas, numpy, matplotlib, plotly, openpyxl, and other common data science libraries pre-installed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        code: {
          type: 'string',
          description: "Python code to execute. Always print results you want to show the user. For charts, save them as files (e.g., plt.savefig('/home/user/chart.png')). For data output, save as CSV (e.g., df.to_csv('/home/user/output.csv')).",
        },
        files: {
          type: 'array',
          description: 'Optional files to upload to the sandbox before execution. Use this to pass scraped data or user-provided content.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              content: { type: 'string' },
            },
          },
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'generate_slides',
    description: 'Generate a professional presentation/slide deck from content. Use this when the user asks for a presentation, deck, slides, or pitch deck. Provide detailed content for each slide including titles, bullet points, and speaker notes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        topic: { type: 'string', description: 'The presentation title/topic' },
        content: { type: 'string', description: 'Detailed content outline with slide-by-slide breakdown. Include main points, data, and key takeaways for each slide.' },
        numSlides: { type: 'number', description: 'Number of slides (default 8-10)' },
      },
      required: ['topic', 'content'],
    },
  },
  {
    name: 'create_google_doc',
    description: 'Create a Google Doc with the provided content. Use this when the user wants their results saved to Google Docs. Requires the user to have connected their Google account.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'The document title' },
        content: { type: 'string', description: 'The document content in markdown format' },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'recall_user_context',
    description: "Query the memory system for specific information about the user. Use this when you need to know the user's preferences, past research topics, industry, company details, or any historical context. Ask natural language questions like 'What industry does the user work in?' or 'Has the user researched competitors before?'",
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Natural language question about the user' },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_google_sheet',
    description: 'Create a Google Spreadsheet with structured data. Use when the user wants data organized in a spreadsheet, comparison tables, datasets, or any tabular output saved to Google Sheets. Requires the user to have connected their Google account.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'The spreadsheet title' },
        headers: { type: 'array', items: { type: 'string' }, description: 'Column headers' },
        rows: { type: 'array', items: { type: 'array', items: { type: 'string' } }, description: 'Data rows as arrays of strings' },
      },
      required: ['title', 'headers', 'rows'],
    },
  },
  {
    name: 'send_email',
    description: 'Send a formatted email to one or more recipients. Use when the user wants to email results, reports, summaries, or notifications to someone.',
    input_schema: {
      type: 'object' as const,
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject line' },
        html: { type: 'string', description: 'Email body as HTML content' },
      },
      required: ['to', 'subject', 'html'],
    },
  },
  {
    name: 'download_file',
    description: 'Download a file from a URL and store it for the user. Use when you need to save PDFs, images, datasets, or other files from the web.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'URL of the file to download' },
        filename: { type: 'string', description: 'Name to save the file as' },
      },
      required: ['url', 'filename'],
    },
  },
];

const SYSTEM_PROMPT = `You are an AI task orchestrator with access to powerful tools. Given a user's request, determine which tools to use and in what order.

AVAILABLE TOOLS AND WHEN TO USE THEM:

- browse_web: Navigate websites, click buttons, fill forms, interact with dynamic content. Use when you need to log in, navigate paginated content, or interact with web apps.

- search_web: Search the internet to find relevant URLs and information. Use as the first step for research tasks.

- scrape_url: Extract clean content from a specific URL. Use after search_web to get full content from the best sources.

- crawl_site: Map an entire website's pages. Use when you need to understand a site's structure or extract from many pages.

- execute_code: Run Python code in a sandbox. The sandbox has pandas, numpy, matplotlib, plotly, seaborn, openpyxl, requests, beautifulsoup4, and other common libraries.

  USE execute_code WHEN:
  * Processing or cleaning scraped data (removing duplicates, formatting, filtering)
  * Creating charts, graphs, or visualizations from data
  * Performing calculations, statistics, or analysis
  * Converting data between formats (JSON to CSV, merge multiple datasets)
  * Generating formatted reports or tables
  * Any task that requires computation beyond text generation

  PYTHON CODE BEST PRACTICES:
  * Always import libraries at the top
  * Print important results so the user sees them
  * Save charts to /home/user/ (e.g., plt.savefig('/home/user/chart.png', dpi=150, bbox_inches='tight'))
  * Save data files to /home/user/ (e.g., df.to_csv('/home/user/output.csv', index=False))
  * Use try/except for error handling in complex operations
  * For charts: use a clean style (plt.style.use('seaborn-v0_8')), include titles and labels, use a good color palette

- synthesize: Process and combine information using AI. Use as the final step to create a polished summary or report from collected data.

- generate_file: Create a downloadable file (HTML report, CSV, etc.) for the user.

- create_google_doc: Create a Google Doc with content. Use when the user wants results saved to Google Docs. The user must have connected their Google account in Settings first.

CHAINING STRATEGY:
- Research tasks: search_web → scrape_url (multiple) → execute_code (if data processing needed) → synthesize → generate_file
- Data analysis: scrape_url → execute_code (process + visualize) → synthesize
- Comparison tasks: search_web → scrape_url (multiple) → execute_code (build comparison table + charts) → synthesize
- Simple questions: search_web → scrape_url → synthesize (no code needed)
- Presentation tasks: search_web (if research needed) → scrape_url → synthesize (outline) → generate_slides
- Google Docs tasks: research/synthesize → create_google_doc
- Google Sheets tasks: research/scrape → execute_code (process data) → create_google_sheet
- Email tasks: research/synthesize → send_email
- File download: search_web → download_file (grab PDFs, datasets, images)
- When the user asks for slides/presentation/deck: ALWAYS use generate_slides as the final step
- When the user asks to save to Google Docs: use create_google_doc after synthesizing content
- When the user asks to save data to a spreadsheet: use create_google_sheet with structured headers and rows
- When the user asks to email results: use send_email with well-formatted HTML

- recall_user_context: Query the memory system for information about the user. Use when you want to personalize results based on user's industry, past research, preferences, or history. Call early in the workflow if personalization would help.

- create_google_sheet: Create a Google Spreadsheet with structured tabular data. Pass headers and rows arrays.

- send_email: Send a formatted HTML email. Always create professional, well-styled HTML content.

- download_file: Download and store a file from a URL. Returns a signed download link.

Always end with synthesize to produce a polished final output. Include any generated charts, files, or links in your synthesis.`;

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
  userId?: string,
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

      case 'execute_code': {
        const res = await fetch(`${supabaseUrl}/functions/v1/code-sandbox`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({
            code: toolInput.code,
            language: 'python',
            files: toolInput.files || [],
            timeout: 45000,
          }),
        });
        const data = await res.json();
        if (!data.success) return `Execution error: ${data.error || data.output?.stderr || 'Unknown'}`;
        const out = data.output;
        let result = '';
        if (out.stdout) result += `STDOUT:\n${out.stdout}\n`;
        if (out.stderr) result += `STDERR:\n${out.stderr}\n`;
        if (out.result) result += `RESULT:\n${out.result}\n`;
        if (out.files?.length) {
          result += `GENERATED FILES:\n${out.files.map((f: any) => `- ${f.name}: ${f.url}`).join('\n')}\n`;
        }
        result += `Execution time: ${out.executionTime}ms`;
        return result;
      }

      case 'generate_slides': {
        const res = await fetch(`${supabaseUrl}/functions/v1/generate-slides`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({
            topic: toolInput.topic,
            content: toolInput.content,
            numSlides: toolInput.numSlides || 10,
          }),
        });
        const data = await res.json();
        if (data.error) return `Error generating slides: ${data.error}`;
        let result = `Presentation generated successfully!\n`;
        if (data.gammaUrl) result += `URL: ${data.gammaUrl}\n`;
        result += `Title: ${data.title}\nSlides: ${data.numSlides}`;
        return result;
      }

      case 'create_google_doc': {
        const res = await fetch(`${supabaseUrl}/functions/v1/create-google-doc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({
            title: toolInput.title,
            content: toolInput.content,
          }),
        });
        const data = await res.json();
        if (data.error) return `Error creating Google Doc: ${data.error}`;
        return `Google Doc created successfully!\nTitle: ${data.title}\nURL: ${data.url}\nDocument ID: ${data.documentId}`;
      }

      case 'recall_user_context': {
        return await queryHonchoMemory(userId || 'unknown', toolInput.query);
      }

      case 'create_google_sheet': {
        const res = await fetch(`${supabaseUrl}/functions/v1/create-google-sheet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({
            title: toolInput.title,
            headers: toolInput.headers,
            rows: toolInput.rows,
          }),
        });
        const data = await res.json();
        if (data.error) return `Error creating Google Sheet: ${data.error}`;
        return `Google Sheet created successfully!\nTitle: ${data.title}\nURL: ${data.url}\nRows: ${data.rowCount}`;
      }

      case 'send_email': {
        const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({
            to: toolInput.to,
            subject: toolInput.subject,
            html: toolInput.html,
          }),
        });
        const data = await res.json();
        if (data.error) return `Error sending email: ${data.error}`;
        return `Email sent successfully to ${toolInput.to}! Message ID: ${data.messageId}`;
      }

      case 'download_file': {
        try {
          const fileRes = await fetch(toolInput.url);
          if (!fileRes.ok) return `Error downloading file: HTTP ${fileRes.status}`;
          const blob = await fileRes.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const fileBytes = new Uint8Array(arrayBuffer);

          const supabaseAdmin = createClient(
            supabaseUrl,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { persistSession: false } },
          );

          const storagePath = `${userId}/${Date.now()}_${toolInput.filename}`;
          const { error: uploadError } = await supabaseAdmin.storage
            .from('generated-files')
            .upload(storagePath, fileBytes, {
              contentType: blob.type || 'application/octet-stream',
              upsert: true,
            });

          if (uploadError) return `Error storing file: ${uploadError.message}`;

          const { data: urlData } = await supabaseAdmin.storage
            .from('generated-files')
            .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

          return JSON.stringify({
            success: true,
            filename: toolInput.filename,
            fileUrl: urlData?.signedUrl || '',
            size: fileBytes.length,
            type: blob.type,
          });
        } catch (err) {
          return `Error downloading file: ${err instanceof Error ? err.message : 'Unknown error'}`;
        }
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

    // --- Fetch Honcho memory context ---
    let honchoContext = '';
    try {
      honchoContext = await getHonchoContext(user.id);
      if (honchoContext) {
        console.log('[ORCHESTRATE] Honcho context loaded:', honchoContext.slice(0, 100));
      }
    } catch (err) {
      console.error('[ORCHESTRATE] Honcho context error (proceeding without):', err);
    }

    const enrichedSystemPrompt = honchoContext
      ? SYSTEM_PROMPT + `\n\nUSER CONTEXT (personalization from memory):\nUse this context to personalize your approach. If the user works in a specific industry, frame research in that context. If they have preferences for output format, follow them.\n${honchoContext}`
      : SYSTEM_PROMPT;

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
          system: enrichedSystemPrompt,
          tools: toolDefinitions,
          messages,
        }),
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
          user.id,
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

    // Store interaction in Honcho (fire-and-forget)
    const assistantSummary = `Orchestrated task using tools: ${executionLog.map((e: any) => e.tool).join(', ')}.\n\nResult summary: ${finalResult.slice(0, 1000)}`;
    storeHonchoMessages(user.id, message, assistantSummary).catch(err =>
      console.error('[ORCHESTRATE] Honcho background store error:', err)
    );

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
