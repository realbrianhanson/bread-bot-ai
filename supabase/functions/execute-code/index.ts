import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const E2B_API = 'https://api.e2b.dev';
const SANDBOX_TIMEOUT_S = 300; // 5 min idle timeout for reusable sandboxes
const MAX_EXEC_TIMEOUT_MS = 60_000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    // Auth
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
    }

    // Usage check
    const { data: usageRows } = await supabase.rpc('get_user_tier_and_usage', { p_user_id: user.id });
    const usage = usageRows?.[0];
    if (usage && usage.code_executions_used >= usage.code_executions_limit) {
      return new Response(JSON.stringify({ error: 'Code execution limit reached. Upgrade for more.' }), { status: 429, headers: jsonHeaders });
    }

    // Resolve E2B key
    let e2bApiKey = Deno.env.get('E2B_API_KEY') ?? '';
    if (usage?.can_use_own_keys) {
      const { data: apiKeyData } = await supabase
        .from('api_keys')
        .select('encrypted_key')
        .eq('user_id', user.id)
        .eq('provider', 'e2b')
        .eq('is_active', true)
        .maybeSingle();
      if (apiKeyData?.encrypted_key) e2bApiKey = apiKeyData.encrypted_key;
    }
    if (!e2bApiKey) {
      return new Response(JSON.stringify({ error: 'E2B API key not configured' }), { status: 500, headers: jsonHeaders });
    }

    // Parse body
    const body = await req.json();
    const { code, language = 'python', conversationId, sandboxId: existingSandboxId } = body as {
      code: string;
      language?: 'python' | 'javascript';
      conversationId?: string;
      sandboxId?: string;
    };

    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing "code"' }), { status: 400, headers: jsonHeaders });
    }

    const startTime = Date.now();
    let sandboxId = existingSandboxId || null;
    let isNewSandbox = false;

    // Try to reuse existing sandbox
    if (sandboxId) {
      try {
        const checkRes = await fetch(`${E2B_API}/sandboxes/${sandboxId}`, {
          headers: { 'X-API-Key': e2bApiKey },
        });
        if (!checkRes.ok) {
          sandboxId = null; // sandbox expired/dead
          await checkRes.text(); // consume body
        } else {
          await checkRes.json(); // consume body
        }
      } catch {
        sandboxId = null;
      }
    }

    // Create new sandbox if needed
    if (!sandboxId) {
      const createRes = await fetch(`${E2B_API}/sandboxes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': e2bApiKey },
        body: JSON.stringify({ templateID: 'code-interpreter-v1', timeout: SANDBOX_TIMEOUT_S }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        return new Response(JSON.stringify({ error: 'Failed to create sandbox', details: errText }), { status: 502, headers: jsonHeaders });
      }

      const sandboxData = await createRes.json();
      sandboxId = sandboxData.sandboxID ?? sandboxData.id;
      isNewSandbox = true;
    }

    const clientID = sandboxId; // for URL construction
    // Execute code
    const sandboxHost = `https://${sandboxId}.e2b.dev`;

    console.log(`[EXECUTE-CODE] Running ${language} on sandbox ${sandboxId} (new=${isNewSandbox})`);

    const execRes = await fetch(`${sandboxHost}/code/execution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': e2bApiKey },
      body: JSON.stringify({ code, language }),
    });

    const execData = await execRes.json();
    const executionTime = Date.now() - startTime;

    const stdout: string = execData.stdout ?? execData.logs?.stdout?.join('\n') ?? '';
    const stderr: string = execData.stderr ?? execData.logs?.stderr?.join('\n') ?? '';
    const result: string = execData.result ?? execData.results?.[0]?.text ?? '';

    // Collect generated files
    const outputFiles: { name: string; url: string; type: string }[] = [];
    const artifacts = execData.artifacts ?? execData.results?.filter((r: any) => r.png || r.html) ?? [];
    const storagePath = `${user.id}/${conversationId ?? Date.now()}`;

    for (const art of artifacts) {
      let fileData: Uint8Array | null = null;
      let fileName = art.name ?? `output-${Date.now()}.png`;
      let mimeType = art.type ?? 'image/png';

      if (art.data) {
        fileData = Uint8Array.from(atob(art.data), (c) => c.charCodeAt(0));
      } else if (art.png) {
        fileData = Uint8Array.from(atob(art.png), (c) => c.charCodeAt(0));
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
        }
      }
    }

    // Track usage
    await supabase.from('usage_tracking').insert({
      user_id: user.id,
      usage_type: 'code_execution',
      metadata: { language, executionTime, conversationId },
    });

    return new Response(JSON.stringify({
      success: true,
      sandboxId,
      output: { stdout, stderr, result, executionTime, files: outputFiles },
    }), { status: 200, headers: jsonHeaders });

  } catch (err: any) {
    console.error('[EXECUTE-CODE] Error:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Internal server error' }), { status: 500, headers: jsonHeaders });
  }
});
