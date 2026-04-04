import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const E2B_API = 'https://api.e2b.dev';
const MAX_TIMEOUT_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 30_000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    // ── Auth ──────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userErr?.message }), { status: 401, headers: jsonHeaders });
    }

    // ── Usage check ──────────────────────────────────────
    const { data: usageRows } = await supabase.rpc('get_user_tier_and_usage', { p_user_id: user.id });
    const usage = usageRows?.[0];
    if (!usage) {
      return new Response(JSON.stringify({ error: 'Unable to fetch usage data' }), { status: 500, headers: jsonHeaders });
    }
    if (usage.browser_tasks_used >= usage.browser_tasks_limit) {
      return new Response(JSON.stringify({ error: 'Usage limit reached. Upgrade your plan for more executions.' }), { status: 429, headers: jsonHeaders });
    }

    // ── Parse body ───────────────────────────────────────
    const body = await req.json();
    const {
      code,
      language = 'python',
      files,
      timeout = DEFAULT_TIMEOUT_MS,
      taskId,
    } = body as {
      code: string;
      language?: 'python' | 'javascript';
      files?: { name: string; content: string }[];
      timeout?: number;
      taskId?: string;
    };

    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid "code" parameter' }), { status: 400, headers: jsonHeaders });
    }

    const effectiveTimeout = Math.min(timeout, MAX_TIMEOUT_MS);

    const E2B_API_KEY = Deno.env.get('E2B_API_KEY');
    if (!E2B_API_KEY) {
      return new Response(JSON.stringify({ error: 'E2B API key is not configured. Please add the E2B_API_KEY secret.' }), { status: 500, headers: jsonHeaders });
    }

    const startTime = Date.now();
    let sandboxId: string | null = null;

    try {
      // ── 1. Create sandbox ──────────────────────────────
      console.log('[CODE-SANDBOX] Creating sandbox for user', user.id);
      const createRes = await fetch(`${E2B_API}/sandboxes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': E2B_API_KEY },
        body: JSON.stringify({ templateID: 'code-interpreter-v1', timeout: Math.ceil(effectiveTimeout / 1000) }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error('[CODE-SANDBOX] Sandbox creation failed:', errText);
        return new Response(JSON.stringify({ error: 'Failed to create sandbox', details: errText }), { status: 502, headers: jsonHeaders });
      }

      const sandboxData = await createRes.json();
      sandboxId = sandboxData.sandboxID ?? sandboxData.id;
      const clientID = sandboxData.clientID ?? sandboxId;
      const sandboxHost = `https://${clientID}-${sandboxId}.e2b.dev`;
      console.log('[CODE-SANDBOX] Sandbox created:', sandboxId);

      // ── 2. Upload files ────────────────────────────────
      if (files && Array.isArray(files)) {
        for (const f of files) {
          console.log('[CODE-SANDBOX] Writing file:', f.name);
          await fetch(`${sandboxHost}/files`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': E2B_API_KEY },
            body: JSON.stringify({ path: `/home/user/${f.name}`, content: f.content }),
          });
        }
      }

      // ── 3. Execute code ────────────────────────────────
      console.log('[CODE-SANDBOX] Executing', language, 'code');
      const execRes = await fetch(`${sandboxHost}/code/execution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': E2B_API_KEY },
        body: JSON.stringify({ code, language }),
      });

      const execData = await execRes.json();
      const executionTime = Date.now() - startTime;

      const stdout: string = execData.stdout ?? execData.logs?.stdout?.join('\n') ?? '';
      const stderr: string = execData.stderr ?? execData.logs?.stderr?.join('\n') ?? '';
      const result: string = execData.result ?? execData.results?.[0]?.text ?? '';

      // ── 4. Collect generated files ─────────────────────
      const outputFiles: { name: string; url: string; type: string }[] = [];

      // Check for artifacts / generated images
      const artifacts: { name: string; type: string; data?: string }[] = execData.artifacts ?? execData.results?.filter((r: any) => r.png || r.html || r.type === 'image') ?? [];

      const storagePath = `${user.id}/${taskId ?? Date.now()}`;

      for (const art of artifacts) {
        let fileData: Uint8Array | null = null;
        let fileName = art.name ?? `output-${Date.now()}.png`;
        let mimeType = art.type ?? 'image/png';

        if (art.data) {
          fileData = Uint8Array.from(atob(art.data), (c) => c.charCodeAt(0));
        } else if ((art as any).png) {
          fileData = Uint8Array.from(atob((art as any).png), (c) => c.charCodeAt(0));
          fileName = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
          mimeType = 'image/png';
        }

        if (fileData) {
          const filePath = `${storagePath}/${fileName}`;
          const { error: uploadErr } = await supabase.storage
            .from('sandbox-outputs')
            .upload(filePath, fileData, { contentType: mimeType, upsert: true });

          if (!uploadErr) {
            const { data: urlData } = await supabase.storage
              .from('sandbox-outputs')
              .createSignedUrl(filePath, 86400);
            if (urlData?.signedUrl) {
              outputFiles.push({ name: fileName, url: urlData.signedUrl, type: mimeType });
            }
          } else {
            console.error('[CODE-SANDBOX] Upload error:', uploadErr);
          }
        }
      }

      // ── 5. Track usage ─────────────────────────────────
      await supabase.from('usage_tracking').insert({
        user_id: user.id,
        usage_type: 'code_execution',
        task_id: taskId ?? null,
        metadata: { language, executionTime },
      });

      // ── 6. Create task record ──────────────────────────
      if (taskId) {
        await supabase.from('tasks').upsert({
          id: taskId,
          user_id: user.id,
          task_type: 'code_execution',
          status: stderr && !stdout ? 'failed' : 'completed',
          input_data: { code: code.substring(0, 2000), language },
          output_data: { stdout: stdout.substring(0, 5000), stderr: stderr.substring(0, 2000), files: outputFiles },
          completed_at: new Date().toISOString(),
        });
      }

      console.log('[CODE-SANDBOX] Execution complete in', executionTime, 'ms');

      return new Response(JSON.stringify({
        success: true,
        output: { stdout, stderr, result, executionTime, files: outputFiles },
      }), { status: 200, headers: jsonHeaders });

    } finally {
      // ── Always kill the sandbox ────────────────────────
      if (sandboxId) {
        console.log('[CODE-SANDBOX] Killing sandbox', sandboxId);
        try {
          await fetch(`${E2B_API}/sandboxes/${sandboxId}`, {
            method: 'DELETE',
            headers: { 'X-API-Key': E2B_API_KEY },
          });
        } catch (killErr) {
          console.error('[CODE-SANDBOX] Failed to kill sandbox:', killErr);
        }
      }
    }

  } catch (err: any) {
    console.error('[CODE-SANDBOX] Unexpected error:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Internal server error' }), { status: 500, headers: jsonHeaders });
  }
});
