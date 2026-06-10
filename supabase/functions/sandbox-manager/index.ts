import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";
import { Sandbox } from "npm:e2b@1.13.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

const SANDBOX_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes per build sandbox (v1)
const DEV_PORT = 5173;

// ---------- Project skeleton written into every new build sandbox ----------

const FILE_PACKAGE_JSON = `{
  "name": "garlicbread-app",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 5173 --strictPort",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^5.4.19"
  }
}
`;

const FILE_VITE_CONFIG = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: ['.e2b.app', '.e2b.dev', 'localhost', '127.0.0.1'],
    hmr: { clientPort: 443 },
  },
})
`;

const FILE_INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GarlicBread App</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;

const FILE_MAIN_JSX = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`;

const FILE_APP_JSX = `export default function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--hero-bg)', color: 'var(--hero-foreground)', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧄</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Build agent is working…</h1>
        <p style={{ color: 'var(--hero-muted)', marginTop: '0.5rem' }}>Your app will appear here as files are written.</p>
      </div>
    </div>
  )
}
`;

const FILE_INDEX_CSS = `:root {
  --background: #FFFFFF;
  --foreground: #0F172A;
  --muted: #F1F5F9;
  --muted-foreground: #64748B;
  --card: #FFFFFF;
  --card-foreground: #0F172A;
  --primary: #4F46E5;
  --primary-foreground: #FFFFFF;
  --secondary: #F1F5F9;
  --secondary-foreground: #0F172A;
  --accent: #F59E0B;
  --accent-foreground: #0F172A;
  --destructive: #EF4444;
  --destructive-foreground: #FFFFFF;
  --border: #E2E8F0;
  --ring: #4F46E5;
  --hero-bg: #0F172A;
  --hero-foreground: #F8FAFC;
  --hero-muted: #94A3B8;
  --section-alt: #F8FAFC;
  --success: #10B981;
  --success-foreground: #FFFFFF;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  color: var(--foreground);
  background: var(--background);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
`;

const RUNNER_SOURCE = `// GarlicBread Build Agent — runs INSIDE the E2B sandbox.
// Zero dependencies. Node 18+. No backticks or dollar-brace sequences (embedded as template literal upstream).
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TASK_ID = process.env.TASK_ID || '';
const BUILD_TOKEN = process.env.BUILD_TOKEN || '';
const CALLBACK_URL = process.env.CALLBACK_URL || '';
const PROXY_URL = process.env.PROXY_URL || '';
const MODEL = process.env.MODEL || 'claude-sonnet-4-6';
const FALLBACK_MODEL = 'claude-opus-4-8';
const APP_DIR = '/home/user/app';
const MAX_TURNS = 30;

const USER_PROMPT = Buffer.from(process.env.PROMPT_B64 || '', 'base64').toString('utf8');

function log(msg) {
  console.log('[RUNNER] ' + msg);
}

async function callback(payload) {
  try {
    await fetch(CALLBACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ action: 'callback', taskId: TASK_ID, token: BUILD_TOKEN }, payload)),
    });
  } catch (e) {
    log('callback failed: ' + e.message);
  }
}

function safePath(p) {
  const resolved = path.resolve(APP_DIR, p);
  if (!resolved.startsWith(APP_DIR + path.sep) && resolved !== APP_DIR) {
    throw new Error('Path escapes app directory: ' + p);
  }
  return resolved;
}

function cap(s, n) {
  if (typeof s !== 'string') s = String(s);
  return s.length > n ? s.slice(0, n) + '\\n...[truncated]' : s;
}

function listFilesRecursive(dir, base, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
    const full = path.join(dir, e.name);
    const rel = path.relative(base, full);
    if (e.isDirectory()) {
      listFilesRecursive(full, base, out);
    } else {
      const size = fs.statSync(full).size;
      out.push(rel + ' (' + size + ' bytes)');
    }
  }
}

function runCommand(cmd, timeoutMs) {
  try {
    const out = execSync(cmd, {
      cwd: APP_DIR,
      timeout: timeoutMs || 180000,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024,
    });
    return { ok: true, output: cap(out || '(no output)', 8000) };
  } catch (e) {
    const stdout = e.stdout ? String(e.stdout) : '';
    const stderr = e.stderr ? String(e.stderr) : '';
    return { ok: false, output: cap('EXIT ERROR\\nSTDOUT:\\n' + stdout + '\\nSTDERR:\\n' + stderr, 8000) };
  }
}

function checkBuild() {
  const res = runCommand('npx vite build --logLevel error', 180000);
  if (res.ok) return 'BUILD OK';
  return 'BUILD FAILED:\\n' + res.output;
}

const TOOLS = [
  {
    name: 'write_file',
    description: 'Create or overwrite a file in the app project. Path is relative to the project root.',
    input_schema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },
  },
  {
    name: 'read_file',
    description: 'Read a file from the app project. Path is relative to the project root.',
    input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
  },
  {
    name: 'replace_in_file',
    description: 'Surgically replace an exact string in a file. old_str must appear exactly once. Prefer this over write_file for edits to existing files.',
    input_schema: { type: 'object', properties: { path: { type: 'string' }, old_str: { type: 'string' }, new_str: { type: 'string' } }, required: ['path', 'old_str', 'new_str'] },
  },
  {
    name: 'list_files',
    description: 'List all files in the app project (excluding node_modules, dist).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'run_command',
    description: 'Run a shell command in the project root (e.g. npm install <pkg>). 180s timeout.',
    input_schema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] },
  },
  {
    name: 'check_build',
    description: 'Run a production build to verify the app compiles. Returns BUILD OK or the exact errors. You MUST get BUILD OK before calling finish.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'finish',
    description: 'Declare the build complete. Only call after check_build returns BUILD OK.',
    input_schema: { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'] },
  },
];

const SYSTEM_PROMPT = [
  'You are an elite full-stack React developer and direct-response designer working inside a LIVE Vite + React project at /home/user/app. The user is watching a hot-reloading preview of this app in real time as you edit files.',
  '',
  'PROJECT SETUP (already done, do not modify): Vite + React 18, entry src/main.jsx renders src/App.jsx, Tailwind via CDN in index.html (all Tailwind utility classes work, no build step needed for CSS), design tokens defined as CSS variables in src/index.css. Do NOT edit vite.config.js, package.json scripts, or index.html script tags.',
  '',
  'YOUR WORKFLOW:',
  '1. Plan the component structure briefly.',
  '2. Build the app: put components in src/components/, pages or sections as components, compose them in src/App.jsx. Use write_file for new files and replace_in_file for edits.',
  '3. After writing or editing files, ALWAYS call check_build. If it fails, read the errors and fix them. Repeat until BUILD OK.',
  '4. Only then call finish with a one-paragraph summary.',
  '',
  'DESIGN RULES:',
  '- Use the CSS variables from src/index.css for ALL colors via Tailwind arbitrary values like bg-[var(--primary)] text-[var(--foreground)] or inline styles. Never use raw Tailwind palette colors for text (no text-gray-400 etc).',
  '- Direct-response quality: bold benefit-driven headlines, clear CTAs with action verbs and reassurance micro-copy, social proof sections, generous spacing (py-20 to py-28 sections), strong visual hierarchy, mobile-responsive (test classes for sm/md/lg).',
  '- Hero sections: dark background var(--hero-bg) with var(--hero-foreground) text, or light with var(--foreground). Never light text on light backgrounds.',
  '- Use lucide-style inline SVGs or emoji for icons. Use https://placehold.co/ for placeholder images with descriptive alt text.',
  '',
  'TECHNICAL RULES:',
  '- React 18 function components with hooks. No TypeScript (use .jsx).',
  '- If you need an npm package, install it with run_command (npm install <pkg>) and then check_build.',
  '- Multi-section apps: keep App.jsx as the composer importing section components. Interactive state lives in the components that need it.',
  '- Keep each file under 300 lines; split into components instead.',
  '',
  'Tool results are truncated to 8000 chars. Be efficient: do not re-read files you just wrote.',
].join('\\n');

async function callModel(messages, model) {
  const body = {
    model: model,
    max_tokens: 8192,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    tools: TOOLS,
    messages: messages,
  };
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-build-token': BUILD_TOKEN,
      'x-task-id': TASK_ID,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('Model call failed (' + res.status + '): ' + cap(t, 500));
  }
  return await res.json();
}

function executeTool(name, input) {
  if (name === 'write_file') {
    const full = safePath(input.path);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, input.content, 'utf8');
    return 'Wrote ' + input.path + ' (' + Buffer.byteLength(input.content) + ' bytes)';
  }
  if (name === 'read_file') {
    const full = safePath(input.path);
    if (!fs.existsSync(full)) return 'ERROR: file not found: ' + input.path;
    return cap(fs.readFileSync(full, 'utf8'), 30000);
  }
  if (name === 'replace_in_file') {
    const full = safePath(input.path);
    if (!fs.existsSync(full)) return 'ERROR: file not found: ' + input.path;
    const content = fs.readFileSync(full, 'utf8');
    const parts = content.split(input.old_str);
    if (parts.length === 1) return 'ERROR: old_str not found in ' + input.path + '. Read the file and try again with the exact text.';
    if (parts.length > 2) return 'ERROR: old_str appears ' + (parts.length - 1) + ' times in ' + input.path + '. Provide a longer unique old_str.';
    fs.writeFileSync(full, parts.join(input.new_str), 'utf8');
    return 'Replaced in ' + input.path;
  }
  if (name === 'list_files') {
    const out = [];
    listFilesRecursive(APP_DIR, APP_DIR, out);
    return out.join('\\n') || '(empty)';
  }
  if (name === 'run_command') {
    const res = runCommand(input.command, 180000);
    return res.output;
  }
  if (name === 'check_build') {
    return checkBuild();
  }
  return 'Unknown tool: ' + name;
}

async function main() {
  if (!TASK_ID || !BUILD_TOKEN || !CALLBACK_URL || !PROXY_URL || !USER_PROMPT) {
    log('Missing required environment. Exiting.');
    process.exit(1);
  }

  await callback({ status: 'running', step: 'Agent started — planning the build', log: 'Agent started' });

  const messages = [{ role: 'user', content: USER_PROMPT }];
  let finished = false;
  let finalSummary = '';
  let filesChanged = 0;

  for (let turn = 1; turn <= MAX_TURNS && !finished; turn++) {
    log('Turn ' + turn);
    let result;
    try {
      result = await callModel(messages, MODEL);
      if (result.stop_reason === 'refusal') {
        log('Refusal — retrying with fallback model');
        result = await callModel(messages, FALLBACK_MODEL);
      }
    } catch (e) {
      log('Model error: ' + e.message);
      await callback({ status: 'failed', error: 'Model call failed: ' + cap(e.message, 300) });
      process.exit(1);
    }

    messages.push({ role: 'assistant', content: result.content });

    const toolUses = (result.content || []).filter(function (b) { return b.type === 'tool_use'; });

    if (toolUses.length === 0) {
      // Model stopped without tools — verify build before accepting.
      const buildStatus = checkBuild();
      if (buildStatus === 'BUILD OK') {
        finished = true;
        const textBlocks = (result.content || []).filter(function (b) { return b.type === 'text'; });
        finalSummary = textBlocks.map(function (b) { return b.text; }).join('\\n');
      } else {
        messages.push({ role: 'user', content: 'The build is not passing yet. Fix these errors, then call finish:\\n' + buildStatus });
        await callback({ step: 'Build verification failed — agent is fixing errors', log: 'Auto-verify caught build errors' });
      }
      continue;
    }

    const toolResults = [];
    for (const tu of toolUses) {
      let output;
      if (tu.name === 'finish') {
        const buildStatus = checkBuild();
        if (buildStatus === 'BUILD OK') {
          finished = true;
          finalSummary = (tu.input && tu.input.summary) || 'Build complete.';
          output = 'Confirmed. Build is clean.';
        } else {
          output = 'Cannot finish — build is failing. Fix these errors first:\\n' + buildStatus;
          await callback({ step: 'Finish rejected — build errors found', log: 'finish rejected by auto-verify' });
        }
      } else {
        try {
          output = executeTool(tu.name, tu.input || {});
          if (tu.name === 'write_file' || tu.name === 'replace_in_file') filesChanged++;
        } catch (e) {
          output = 'TOOL ERROR: ' + e.message;
        }
      }
      toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: cap(output, 8000) });
      const inputPath = tu.input && tu.input.path ? ' ' + tu.input.path : '';
      await callback({ step: 'Turn ' + turn + ': ' + tu.name + inputPath, log: tu.name + inputPath });
    }

    messages.push({ role: 'user', content: toolResults });

    // Context guard: keep first message and the most recent 24 messages.
    if (messages.length > 30) {
      const head = messages.slice(0, 1);
      const tail = messages.slice(messages.length - 24);
      // Ensure tail starts with an assistant or user text message, not an orphaned tool_result pairing issue:
      // find first index in tail where role is 'assistant'
      let startIdx = 0;
      for (let i = 0; i < tail.length; i++) {
        if (tail[i].role === 'assistant') { startIdx = i; break; }
      }
      const trimmed = head.concat([{ role: 'user', content: '[Earlier build steps omitted to save context. The project files on disk are the source of truth — use list_files and read_file if you need to re-check anything.]' }]).concat(tail.slice(startIdx));
      messages.length = 0;
      Array.prototype.push.apply(messages, trimmed);
    }
  }

  if (finished) {
    await callback({
      status: 'completed',
      step: 'Build complete',
      summary: cap(finalSummary, 2000),
      files_changed: filesChanged,
      log: 'Build complete (' + filesChanged + ' file writes)',
    });
    log('Done.');
  } else {
    await callback({ status: 'failed', error: 'Agent hit the ' + MAX_TURNS + '-turn limit without completing. Partial work is visible in the preview.' });
    log('Turn limit reached.');
  }
}

main().catch(async function (e) {
  log('Fatal: ' + e.message);
  await callback({ status: 'failed', error: 'Fatal runner error: ' + cap(e.message, 300) });
  process.exit(1);
});
`;

// ---------- Helpers ----------

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );
}

async function appendLog(supabase: any, taskId: string, current: any, fields: Record<string, any>, logEntry?: string) {
  const outputData = { ...(current || {}) };
  if (logEntry) {
    const log = Array.isArray(outputData.log) ? outputData.log : [];
    log.push({ t: new Date().toISOString(), m: String(logEntry).slice(0, 300) });
    outputData.log = log.slice(-200);
  }
  Object.assign(outputData, fields.output_data || {});
  const update: Record<string, any> = { output_data: outputData };
  if (fields.status) update.status = fields.status;
  if (fields.error_message !== undefined) update.error_message = fields.error_message;
  if (fields.completed_at) update.completed_at = fields.completed_at;
  await supabase.from('tasks').update(update).eq('id', taskId);
  return outputData;
}

// ---------- Bootstrap (runs in background after `create` responds) ----------

async function bootstrapBuild(taskId: string, buildToken: string, prompt: string, model: string) {
  const supabase = serviceClient();
  const e2bApiKey = Deno.env.get('E2B_API_KEY') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

  const readTask = async () => {
    const { data } = await supabase.from('tasks').select('output_data,status').eq('id', taskId).single();
    return data;
  };

  let sandbox: Sandbox | null = null;
  try {
    let task = await readTask();
    let od = await appendLog(supabase, taskId, task?.output_data, { output_data: { phase: 'creating_sandbox' } }, 'Creating sandbox');

    sandbox = await Sandbox.create('base', {
      apiKey: e2bApiKey,
      timeoutMs: SANDBOX_TIMEOUT_MS,
      metadata: { taskId, app: 'garlicbread-build' },
    });

    od = await appendLog(supabase, taskId, od, { output_data: { sandbox_id: sandbox.sandboxId, phase: 'writing_skeleton' } }, 'Sandbox created: ' + sandbox.sandboxId);

    await sandbox.files.write([
      { path: '/home/user/app/package.json', data: FILE_PACKAGE_JSON },
      { path: '/home/user/app/vite.config.js', data: FILE_VITE_CONFIG },
      { path: '/home/user/app/index.html', data: FILE_INDEX_HTML },
      { path: '/home/user/app/src/main.jsx', data: FILE_MAIN_JSX },
      { path: '/home/user/app/src/App.jsx', data: FILE_APP_JSX },
      { path: '/home/user/app/src/index.css', data: FILE_INDEX_CSS },
      { path: '/home/user/runner.cjs', data: RUNNER_SOURCE },
    ]);

    od = await appendLog(supabase, taskId, od, { output_data: { phase: 'installing_deps' } }, 'Installing dependencies (npm install)');

    const install = await sandbox.commands.run('cd /home/user/app && npm install --no-audit --no-fund', { timeoutMs: 240000 });
    if (install.exitCode !== 0) {
      throw new Error('npm install failed: ' + (install.stderr || install.stdout || '').slice(0, 500));
    }

    od = await appendLog(supabase, taskId, od, { output_data: { phase: 'starting_dev_server' } }, 'Starting dev server');

    await sandbox.commands.run('cd /home/user/app && nohup npm run dev > /home/user/dev-server.log 2>&1 &', { timeoutMs: 15000 });

    const host = sandbox.getHost(DEV_PORT);
    const previewUrl = 'https://' + host;

    od = await appendLog(supabase, taskId, od, { output_data: { preview_url: previewUrl, phase: 'starting_agent' } }, 'Preview live at ' + previewUrl);

    const callbackUrl = supabaseUrl + '/functions/v1/sandbox-manager';
    const proxyUrl = supabaseUrl + '/functions/v1/anthropic-proxy';
    const promptB64 = btoa(unescape(encodeURIComponent(prompt)));

    await sandbox.commands.run('nohup node /home/user/runner.cjs > /home/user/runner.log 2>&1 &', {
      timeoutMs: 15000,
      envs: {
        TASK_ID: taskId,
        BUILD_TOKEN: buildToken,
        CALLBACK_URL: callbackUrl,
        PROXY_URL: proxyUrl,
        MODEL: model,
        PROMPT_B64: promptB64,
      },
    });

    await appendLog(supabase, taskId, od, { status: 'running', output_data: { phase: 'agent_running' } }, 'Build agent launched');
  } catch (err) {
    console.error('[SANDBOX-MANAGER] Bootstrap failed:', err);
    const task = await readTask();
    await appendLog(supabase, taskId, task?.output_data, {
      status: 'failed',
      error_message: 'Bootstrap failed: ' + (err instanceof Error ? err.message : String(err)).slice(0, 500),
      completed_at: new Date().toISOString(),
    }, 'Bootstrap failed');
    if (sandbox) {
      try { await sandbox.kill(); } catch (_) { /* ignore */ }
    }
  }
}

// ---------- HTTP handler ----------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action;

    // ----- Runner callback (token-authenticated, no user JWT) -----
    if (action === 'callback') {
      const { taskId, token, status, step, log, summary, files_changed, error } = body;
      if (!taskId || !token) {
        return new Response(JSON.stringify({ error: 'Missing taskId or token' }), { status: 400, headers: jsonHeaders });
      }
      const supabase = serviceClient();
      const { data: task } = await supabase.from('tasks').select('output_data,status,task_type').eq('id', taskId).single();
      if (!task || task.task_type !== 'app_build' || task.output_data?.build_token !== token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
      }
      if (['completed', 'failed', 'stopped'].includes(task.status)) {
        return new Response(JSON.stringify({ ok: true, note: 'terminal' }), { headers: jsonHeaders });
      }

      const fields: Record<string, any> = { output_data: {} };
      if (step) fields.output_data.current_step = String(step).slice(0, 200);
      if (summary) fields.output_data.summary = summary;
      if (typeof files_changed === 'number') fields.output_data.files_changed = files_changed;
      if (status === 'completed') {
        fields.status = 'completed';
        fields.completed_at = new Date().toISOString();
      } else if (status === 'failed') {
        fields.status = 'failed';
        fields.error_message = (error || 'Build failed').slice(0, 500);
        fields.completed_at = new Date().toISOString();
      } else if (status === 'running') {
        fields.status = 'running';
      }

      await appendLog(supabase, taskId, task.output_data, fields, log);
      return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
    }

    // ----- User-authenticated actions -----
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: jsonHeaders });
    }
    const token = authHeader.replace('Bearer ', '');
    const supabase = serviceClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
    }

    if (action === 'create') {
      const prompt = (body.prompt || '').trim();
      const model = ['claude-sonnet-4-6', 'claude-fable-5'].includes(body.model) ? body.model : 'claude-sonnet-4-6';
      if (!prompt || prompt.length < 10) {
        return new Response(JSON.stringify({ error: 'Prompt is required (min 10 chars)' }), { status: 400, headers: jsonHeaders });
      }

      // Usage gate (reuses chat message quota for v1)
      const { data: usageData } = await supabase.rpc('get_user_tier_and_usage', { p_user_id: user.id });
      const usage = usageData?.[0];
      if (!usage) {
        return new Response(JSON.stringify({ error: 'Unable to fetch usage data' }), { status: 500, headers: jsonHeaders });
      }
      if (usage.chat_messages_used >= usage.chat_messages_limit) {
        return new Response(JSON.stringify({ error: 'quota_exceeded', message: 'Monthly limit reached. Please upgrade your plan.', limit_exceeded: true }), { status: 402, headers: jsonHeaders });
      }

      const buildToken = generateToken();
      const { data: taskRecord, error: taskError } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          project_id: body.projectId || null,
          task_type: 'app_build',
          status: 'initializing',
          started_at: new Date().toISOString(),
          input_data: { prompt: prompt.slice(0, 5000), model },
          output_data: { build_token: buildToken, log: [], phase: 'queued' },
        })
        .select()
        .single();

      if (taskError || !taskRecord) {
        return new Response(JSON.stringify({ error: 'Failed to create build record' }), { status: 500, headers: jsonHeaders });
      }

      await supabase.from('usage_tracking').insert({ user_id: user.id, usage_type: 'chat_message', quantity: 1, task_id: taskRecord.id });

      const bootstrapPromise = bootstrapBuild(taskRecord.id, buildToken, prompt, model);
      // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(bootstrapPromise);
      } else {
        bootstrapPromise.catch((e) => console.error('[SANDBOX-MANAGER] background error:', e));
      }

      return new Response(JSON.stringify({ taskId: taskRecord.id, status: 'initializing' }), { headers: jsonHeaders });
    }

    if (action === 'status') {
      const { taskId } = body;
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).eq('user_id', user.id).single();
      if (!task) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: jsonHeaders });
      const { build_token: _omit, ...safeOutput } = task.output_data || {};
      return new Response(JSON.stringify({ task: { ...task, output_data: safeOutput } }), { headers: jsonHeaders });
    }

    if (action === 'stop') {
      const { taskId } = body;
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).eq('user_id', user.id).single();
      if (!task) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: jsonHeaders });

      const sandboxId = task.output_data?.sandbox_id;
      if (sandboxId) {
        try {
          const sbx = await Sandbox.connect(sandboxId, { apiKey: Deno.env.get('E2B_API_KEY') ?? '' });
          await sbx.kill();
        } catch (e) {
          console.error('[SANDBOX-MANAGER] kill failed (may already be dead):', e);
        }
      }
      await appendLog(supabase, taskId, task.output_data, {
        status: 'stopped',
        completed_at: new Date().toISOString(),
      }, 'Stopped by user');
      return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: jsonHeaders });
  } catch (error) {
    console.error('[SANDBOX-MANAGER] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: jsonHeaders });
  }
});
