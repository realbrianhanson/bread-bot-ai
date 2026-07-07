import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";
import { Sandbox } from "npm:e2b@1.13.0";
import { DESIGN_CONSTITUTION, FORMS_INSTRUCTIONS } from "../_shared/design-constitution.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

const SANDBOX_TIMEOUT_MS = 45 * 60 * 1000; // 45 minutes per build sandbox (slow-build keepalive)
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
  base: './',
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
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              background: 'var(--background)',
              foreground: 'var(--foreground)',
              muted: { DEFAULT: 'var(--muted)', foreground: 'var(--muted-foreground)' },
              card: { DEFAULT: 'var(--card)', foreground: 'var(--card-foreground)' },
              primary: { DEFAULT: 'var(--primary)', foreground: 'var(--primary-foreground)' },
              secondary: { DEFAULT: 'var(--secondary)', foreground: 'var(--secondary-foreground)' },
              accent: { DEFAULT: 'var(--accent)', foreground: 'var(--accent-foreground)' },
              destructive: { DEFAULT: 'var(--destructive)', foreground: 'var(--destructive-foreground)' },
              border: 'var(--border)',
              ring: 'var(--ring)',
              hero: { DEFAULT: 'var(--hero-bg)', foreground: 'var(--hero-foreground)', muted: 'var(--hero-muted)' },
              success: { DEFAULT: 'var(--success)', foreground: 'var(--success-foreground)' }
            },
            fontFamily: {
              sans: ['var(--font-body)'],
              display: ['var(--font-display)']
            },
            borderRadius: {
              DEFAULT: 'var(--radius)',
              lg: 'calc(var(--radius) + 4px)',
              xl: 'calc(var(--radius) + 8px)'
            }
          }
        }
      }
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
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
  --font-display: 'Space Grotesk', 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
  --radius: 12px;

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

html { scroll-behavior: smooth; }

body {
  font-family: var(--font-body);
  color: var(--foreground);
  background: var(--background);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

h1, h2, h3, h4 {
  font-family: var(--font-display);
  letter-spacing: -0.02em;
  line-height: 1.1;
}

::selection { background: var(--primary); color: var(--primary-foreground); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
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
const PREVIEW_URL = process.env.PREVIEW_URL || '';
const APP_DIR = '/home/user/app';
const MAX_TURNS = 30;

const USER_PROMPT = Buffer.from(process.env.PROMPT_B64 || '', 'base64').toString('utf8');
const DESIGN_MD = Buffer.from(process.env.DESIGN_MD_B64 || '', 'base64').toString('utf8');
const MARKETING_MD = Buffer.from(process.env.MARKETING_MD_B64 || '', 'base64').toString('utf8');
const KNOWLEDGE_MD = Buffer.from(process.env.KNOWLEDGE_MD_B64 || '', 'base64').toString('utf8');
const IS_EDIT = process.env.IS_EDIT === '1';
const FORM_KEY = process.env.FORM_KEY || '';
const FORM_ENDPOINT_URL = process.env.FORM_ENDPOINT_URL || '';

function log(msg) {
  console.log('[RUNNER] ' + msg);
}

async function callback(payload) {
  try {
    await fetch(CALLBACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ action: 'callback', taskId: TASK_ID, token: BUILD_TOKEN, todos: CURRENT_TODOS }, payload)),
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
    name: 'update_todos',
    description: 'Report the current TODO checklist state so the UI can render a live checklist. Send the full ordered list every time you update it. Also write/replace the same list into TODO.md so it survives snapshots. Statuses: "pending", "in_progress", "done", "dropped" (with reason).',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              text: { type: 'string' },
              status: { type: 'string', enum: ['pending', 'in_progress', 'done', 'dropped'] },
              reason: { type: 'string' },
            },
            required: ['id', 'text', 'status'],
          },
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'finish',
    description: 'Declare the build complete. Only call after check_build returns BUILD OK.',
    input_schema: { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'] },
  },
];

const PROJECT_SETUP = 'PROJECT SETUP: Vite + React 18, entry src/main.jsx renders src/App.jsx, Tailwind via CDN. Design tokens are CSS variables in src/index.css. Tailwind is mapped so the tokens are consumed via hsl(): tokens live in src/index.css as bare HSL triples (e.g. --primary: 244 75% 57%) and are used as hsl(var(--primary)) or via mapped Tailwind classes (bg-background, text-foreground, bg-primary, text-primary-foreground, bg-secondary, bg-accent, bg-muted, text-muted-foreground, bg-card, border-border, bg-hero, text-hero-foreground, text-hero-muted, font-display, font-sans, rounded, rounded-lg, rounded-xl). Do NOT edit vite.config.js, package.json scripts, or index.html.';

const PLAN_FIRST_CREATE = [
  'REQUIRED FIRST ACTIONS on a NEW build, in this order, before any components:',
  '1. write_file PLAN.md — cover: pages/sections list, signature element for this project, palette rationale (name the colors, not just "blue"), font pairing rationale, one paragraph explaining how this brief maps to the design plan.',
  '2. write_file TODO.md — a markdown checklist of the concrete build steps in order. Use "- [ ] step" for each item. Include tokens step, each page section, wiring, responsive pass, and check_build.',
  '3. update_todos — call with the same items you put in TODO.md so the UI checklist appears live.',
  "4. write_file DECISIONS.md — start the design & build journal with a first entry: \`## <today\'s date> — Initial build\` followed by 3–8 bullets covering the brief in your own words and the key design choices you are locking in (palette, fonts, radius, hero pattern, signature element). This file is the memory across future edits.",
  '5. Rewrite src/index.css tokens for this project (from the design plan). Then start building.',
  '',
  'As you complete each step, call update_todos with the new statuses AND call replace_in_file on TODO.md to tick the matching checkbox ("- [ ] X" -> "- [x] X"). If you decide a step is no longer necessary, mark it status "dropped" with a short reason instead of deleting it.',
].join('\\n');

const PLAN_FIRST_EDIT = [
  'REQUIRED FIRST ACTIONS on an EDIT run:',
  '1. read_file PLAN.md — respect the original design decisions. Do not change palette, fonts, or radius unless the change request explicitly asks for it. If PLAN.md is missing, create one from what the existing code implies before making edits.',
  '2. read_file DECISIONS.md — this is the running journal of every previous change. Read it so you understand why things are the way they are before touching them. If DECISIONS.md is missing, create it now from the existing code.',
  '3. read_file TODO.md if it exists so you know what was already done.',
  '4. list_files, then read only the files relevant to the change request.',
  '5. Add new TODO items for this edit via update_todos (and append to TODO.md). Tick them off as you go.',
  '6. Prefer replace_in_file for targeted edits over rewriting whole files.',
  '',
  "BEFORE calling finish: append a new entry to DECISIONS.md using replace_in_file — one section titled \`## <today\'s date> — <one-line summary of the edit>\` followed by short bullets covering: what the user asked for, what you changed, and any tradeoffs or choices worth remembering. This journal is included in every future snapshot.",
].join('\\n');

const FINISH_GATE_NOTE = 'FINISH GATE: finish is only accepted when (a) check_build returns BUILD OK, (b) runtime verification passes, and (c) every TODO item is either "done" or "dropped" with a reason. Unchecked items will block finish.';

const SYSTEM_PROMPT_BASE = [
  'You are the design lead and senior React engineer at a studio known for giving every client a visual identity that could not be mistaken for anyone else. You work inside a LIVE Vite + React project at /home/user/app and the user watches a hot-reloading preview as you edit files.',
  '',
  PROJECT_SETUP,
  '',
  '__PLAN_FIRST__',
  '',
  '__DESIGN_CONSTITUTION__',
  '',
  'USER DESIGN SYSTEM (from the picker — apply as extra constraints on top of the constitution; if empty, ignore):',
  '__DESIGN_MD__',
  '',
  'MARKETING / PAGE PURPOSE FRAMEWORK (from the picker — apply to structure, copy and conversion elements; if empty, ignore):',
  '__MARKETING_MD__',
  '',
  'USER KNOWLEDGE BASE SUMMARY (facts about the user or their business; use only if relevant):',
  '__KNOWLEDGE_MD__',
  '',
  '__FORMS_INSTRUCTIONS__',
  '',
  'WORKFLOW:',
  '1. Follow the REQUIRED FIRST ACTIONS above.',
  '2. Build the app: components in src/components/, composed in src/App.jsx. Use write_file for new files and replace_in_file for edits.',
  '3. After writing or editing files, ALWAYS call check_build. If it fails, read the errors and fix them. Repeat until BUILD OK.',
  '4. Keep calling update_todos as you progress.',
  '5. Only then call finish with a one-paragraph summary.',
  '',
  FINISH_GATE_NOTE,
  '',
  'TECHNICAL RULES:',
  '- React 18 function components with hooks. No TypeScript (use .jsx).',
  '- If you need an npm package, install it with run_command (npm install <pkg>) and then check_build.',
  '- Multi-section apps: keep App.jsx as the composer importing section components. Interactive state lives in the components that need it.',
  '- Keep each file under 300 lines; split into components instead.',
  '',
  'Tool results are truncated to 8000 chars. Be efficient: do not re-read files you just wrote.',
].join('\n');

const SYSTEM_PROMPT = SYSTEM_PROMPT_BASE
  .replace('__PLAN_FIRST__', IS_EDIT ? PLAN_FIRST_EDIT : PLAN_FIRST_CREATE)
  .replace('__DESIGN_MD__', DESIGN_MD || '(none provided)')
  .replace('__MARKETING_MD__', MARKETING_MD || '(none provided)')
  .replace('__KNOWLEDGE_MD__', KNOWLEDGE_MD || '(none provided)')
  .replace('__FORMS_INSTRUCTIONS__',
    '__FORMS_TEMPLATE__'
      .split('{{FORM_ENDPOINT}}').join(FORM_ENDPOINT_URL)
      .split('{{FORM_KEY}}').join(FORM_KEY));
// Note: the __DESIGN_CONSTITUTION__ placeholder is filled by the SANDBOX MANAGER
// before this runner source is written into the sandbox, because the runner
// cannot import Deno modules. See RUNNER_SOURCE.replace(...) below.

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function callModel(messages, model) {
  const body = {
    model: model,
    max_tokens: 8192,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    tools: TOOLS,
    messages: messages,
  };
  // Retry ladder: 3 attempts with exponential backoff on 429/5xx/network.
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-build-token': BUILD_TOKEN, 'x-task-id': TASK_ID },
        body: JSON.stringify(body),
      });
      if (res.status === 429 || res.status >= 500) {
        const t = await res.text();
        lastErr = new Error('Model call ' + res.status + ': ' + cap(t, 300));
        log('Retryable model error (' + res.status + '), attempt ' + (attempt + 1));
        await sleep(1500 * Math.pow(2, attempt));
        continue;
      }
      if (!res.ok) {
        const t = await res.text();
        throw new Error('Model call failed (' + res.status + '): ' + cap(t, 500));
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
      const msg = String(e && e.message || e);
      // Retry only on network-ish errors; if the previous branch already threw a non-retryable, rethrow.
      if (attempt < 2 && /fetch|network|ECONN|timeout|Failed to fetch/i.test(msg)) {
        log('Network error, retrying: ' + msg);
        await sleep(1500 * Math.pow(2, attempt));
        continue;
      }
      throw e;
    }
  }
  throw lastErr || new Error('Model call failed after retries');
}

// Runtime verification: after check_build passes, confirm the dev server actually renders
// and all script/link references in index.html resolve.
async function verifyRuntime() {
  if (!PREVIEW_URL) return { ok: true, notes: 'skipped (no preview url)' };
  try {
    const rootRes = await fetch(PREVIEW_URL, { redirect: 'follow' });
    if (!rootRes.ok) return { ok: false, notes: 'Preview root returned HTTP ' + rootRes.status };
    const html = await rootRes.text();
    if (!html || html.length < 40) return { ok: false, notes: 'Preview HTML was empty or too small (' + html.length + ' bytes)' };
    if (!/<div[^>]+id=["']root["']/i.test(html)) return { ok: false, notes: 'Preview HTML is missing the #root mount point' };

    // Extract same-origin asset refs
    const refs = [];
    const scriptRe = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const linkRe = /<link[^>]+href=["']([^"']+)["'][^>]*rel=["'](?:stylesheet|modulepreload)["'][^>]*>/gi;
    let m;
    while ((m = scriptRe.exec(html)) !== null) refs.push(m[1]);
    while ((m = linkRe.exec(html)) !== null) refs.push(m[1]);

    const failures = [];
    for (const ref of refs) {
      if (/^https?:/i.test(ref) || ref.startsWith('//')) continue; // external
      const abs = new URL(ref, PREVIEW_URL).toString();
      try {
        const r = await fetch(abs, { method: 'GET' });
        if (!r.ok) failures.push(ref + ' → HTTP ' + r.status);
        else {
          const body = await r.text();
          if (/^\s*<!doctype|^\s*<html/i.test(body) && !ref.endsWith('.html')) {
            failures.push(ref + ' → returned HTML instead of the expected asset (likely 404 SPA fallback)');
          }
        }
      } catch (e) {
        failures.push(ref + ' → fetch failed: ' + (e && e.message || e));
      }
    }
    if (failures.length > 0) return { ok: false, notes: 'Broken asset references:\\n' + failures.join('\n') };
    return { ok: true, notes: 'Runtime OK (' + refs.length + ' assets)' };
  } catch (e) {
    return { ok: false, notes: 'Runtime check errored: ' + (e && e.message || e) };
  }
}

let CURRENT_TODOS = [];

function todoGateOk() {
  if (!Array.isArray(CURRENT_TODOS) || CURRENT_TODOS.length === 0) return { ok: false, note: 'You have not called update_todos yet — the UI has no checklist. Report the TODO state before finishing.' };
  const unfinished = CURRENT_TODOS.filter(function (t) { return t && t.status !== 'done' && t.status !== 'dropped'; });
  if (unfinished.length > 0) {
    return { ok: false, note: 'These TODO items are still unfinished: ' + unfinished.map(function (t) { return '"' + (t.text || t.id) + '"'; }).join(', ') + '. Either complete them or mark them dropped with a reason via update_todos before finishing.' };
  }
  return { ok: true, note: '' };
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
    return out.join('\n') || '(empty)';
  }
  if (name === 'run_command') {
    const res = runCommand(input.command, 180000);
    return res.output;
  }
  if (name === 'check_build') {
    return checkBuild();
  }
  if (name === 'update_todos') {
    const items = Array.isArray(input.items) ? input.items.slice(0, 60) : [];
    CURRENT_TODOS = items.map(function (it, i) {
      return {
        id: String(it.id || ('t' + i)).slice(0, 40),
        text: String(it.text || '').slice(0, 200),
        status: ['pending', 'in_progress', 'done', 'dropped'].indexOf(String(it.status)) >= 0 ? String(it.status) : 'pending',
        reason: it.reason ? String(it.reason).slice(0, 200) : undefined,
      };
    });
    return 'Todos updated (' + CURRENT_TODOS.length + ' items). Remember to also write TODO.md so it survives snapshots.';
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

    // Handle context / max_tokens: instruct the model to split large writes and continue.
    if (result.stop_reason === 'max_tokens') {
      log('Model hit max_tokens — asking it to continue in smaller chunks');
      messages.push({ role: 'user', content: 'Your previous response was cut off at the token limit. Continue where you left off. If you were writing a large file, split it into smaller components (each under 200 lines) and write them separately with write_file so nothing gets truncated.' });
      await callback({ step: 'Turn ' + turn + ': continuing after token limit', log: 'max_tokens continue' });
      continue;
    }

    const toolUses = (result.content || []).filter(function (b) { return b.type === 'tool_use'; });

    if (toolUses.length === 0) {
      // Model stopped without tools — verify build before accepting.
      const buildStatus = checkBuild();
      if (buildStatus === 'BUILD OK') {
        const runtime = await verifyRuntime();
        if (runtime.ok) {
          const gate = todoGateOk();
          if (gate.ok) {
            finished = true;
            const textBlocks = (result.content || []).filter(function (b) { return b.type === 'text'; });
            finalSummary = textBlocks.map(function (b) { return b.text; }).join('\n');
          } else {
            messages.push({ role: 'user', content: 'The build compiles and runs, but the TODO checklist is not complete. ' + gate.note });
            await callback({ step: 'Finish blocked — TODO items still open', log: gate.note.slice(0, 200) });
          }
        } else {
          messages.push({ role: 'user', content: 'The production build passes but the running preview has problems. Fix these and call check_build then finish again:\\n' + runtime.notes });
          await callback({ step: 'Runtime verification failed — agent is fixing', log: runtime.notes.slice(0, 200) });
        }
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
          const runtime = await verifyRuntime();
          if (runtime.ok) {
            const gate = todoGateOk();
            if (gate.ok) {
              finished = true;
              finalSummary = (tu.input && tu.input.summary) || 'Build complete.';
              output = 'Confirmed. Build is clean, runtime looks healthy, TODO checklist is complete.';
            } else {
              output = 'Cannot finish yet — TODO gate: ' + gate.note;
              await callback({ step: 'Finish rejected — TODO items still open', log: gate.note.slice(0, 200) });
            }
          } else {
            output = 'Cannot finish yet — runtime verification failed:\\n' + runtime.notes + '\\nFix these and try again.';
            await callback({ step: 'Finish rejected — runtime issues', log: 'runtime verification failed' });
          }
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
    // Partial completion: preserve what exists so the user can continue instead of failing outright.
    await callback({
      status: 'completed_partial',
      step: 'Reached step limit — partial build saved',
      summary: 'Agent reached the ' + MAX_TURNS + '-turn limit before wrapping up. Everything written so far is saved — click Continue building to pick up where it left off.',
      files_changed: filesChanged,
      log: 'Turn limit reached; partial build preserved',
    });
    log('Turn limit reached — completed_partial.');
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

function renderRunnerSource(): string {
  // Inject the shared design constitution into the runner (which cannot import Deno modules).
  // The placeholder lands inside a JS single-quoted string literal in the runner
  // source, so escape backslashes, single quotes, and newlines. Backticks and
  // ${...} sequences do not need escaping inside single quotes.
  const escapeForJsString = (s: string) => s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, '\\n');
  const safeConstitution = escapeForJsString(DESIGN_CONSTITUTION);
  const safeForms = escapeForJsString(FORMS_INSTRUCTIONS);
  // Use function replacers so `$` sequences are not interpreted by String.replace.
  return RUNNER_SOURCE
    .replace(/__DESIGN_CONSTITUTION__/g, () => safeConstitution)
    .replace(/__FORMS_TEMPLATE__/g, () => safeForms);
}

async function loadUserContextForBuild(supabase: any, userId: string): Promise<{ knowledgeMd: string }> {
  try {
    const { data } = await supabase
      .from('knowledge_entries')
      .select('title, content')
      .eq('user_id', userId)
      .limit(12);
    if (!data || data.length === 0) return { knowledgeMd: '' };
    const md = data
      .map((e: any) => '## ' + String(e.title || 'Entry').slice(0, 80) + '\n' + String(e.content || '').slice(0, 800))
      .join('\n\n')
      .slice(0, 8000);
    return { knowledgeMd: md };
  } catch (_) {
    return { knowledgeMd: '' };
  }
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

async function bootstrapBuild(taskId: string, buildToken: string, prompt: string, model: string, ctx: { designMd?: string; marketingMd?: string; knowledgeMd?: string } = {}) {
  const supabase = serviceClient();
  const e2bApiKey = Deno.env.get('E2B_API_KEY') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const formEndpoint = supabaseUrl + '/functions/v1/submit-form';

  // Generate/reuse a stable form_key for this app lineage. Stored on the task
  // and reused at publish time so the built app's forms hit the right owner.
  const formKey = 'fk_' + Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => b.toString(16).padStart(2, '0')).join('');

  const readTask = async () => {
    const { data } = await supabase.from('tasks').select('output_data,status').eq('id', taskId).single();
    return data;
  };

  let sandbox: Sandbox | null = null;
  try {
    let task = await readTask();
    let od = await appendLog(supabase, taskId, task?.output_data, { output_data: { phase: 'creating_sandbox', form_key: formKey } }, 'Creating sandbox');

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
      { path: '/home/user/runner.cjs', data: renderRunnerSource() },
    ]);

    od = await appendLog(supabase, taskId, od, { output_data: { phase: 'installing_deps' } }, 'Installing dependencies (npm install)');

    const install = await sandbox.commands.run('cd /home/user/app && npm install --no-audit --no-fund', { timeoutMs: 240000 });
    if (install.exitCode !== 0) {
      throw new Error('npm install failed: ' + (install.stderr || install.stdout || '').slice(0, 500));
    }

    od = await appendLog(supabase, taskId, od, { output_data: { phase: 'starting_dev_server' } }, 'Starting dev server');

    await sandbox.commands.run('cd /home/user/app && npm run dev > /home/user/dev-server.log 2>&1', { background: true, timeoutMs: 0 } as any);

    const host = sandbox.getHost(DEV_PORT);
    const previewUrl = 'https://' + host;

    od = await appendLog(supabase, taskId, od, { output_data: { preview_url: previewUrl, phase: 'starting_agent' } }, 'Preview live at ' + previewUrl);

    const callbackUrl = supabaseUrl + '/functions/v1/sandbox-manager';
    const proxyUrl = supabaseUrl + '/functions/v1/anthropic-proxy';
    const promptB64 = btoa(unescape(encodeURIComponent(prompt)));
    const designB64 = btoa(unescape(encodeURIComponent(ctx.designMd || '')));
    const marketingB64 = btoa(unescape(encodeURIComponent(ctx.marketingMd || '')));
    const knowledgeB64 = btoa(unescape(encodeURIComponent(ctx.knowledgeMd || '')));

    await sandbox.commands.run('node /home/user/runner.cjs > /home/user/runner.log 2>&1', {
      background: true,
      timeoutMs: 0,
      envs: {
        TASK_ID: taskId,
        BUILD_TOKEN: buildToken,
        CALLBACK_URL: callbackUrl,
        PROXY_URL: proxyUrl,
        MODEL: model,
        PROMPT_B64: promptB64,
        PREVIEW_URL: previewUrl,
        DESIGN_MD_B64: designB64,
        MARKETING_MD_B64: marketingB64,
        KNOWLEDGE_MD_B64: knowledgeB64,
        IS_EDIT: '0',
        FORM_KEY: formKey,
        FORM_ENDPOINT_URL: formEndpoint,
      },
    } as any);

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

// ---------- Snapshot & edit-resume ----------

async function snapshotSandbox(taskId: string, userId: string, sandboxId: string) {
  const supabase = serviceClient();
  try {
    const sbx = await Sandbox.connect(sandboxId, { apiKey: Deno.env.get('E2B_API_KEY') ?? '' });
    const tarRes = await sbx.commands.run("cd /home/user/app && tar -czf /home/user/snapshot.tar.gz --exclude=node_modules --exclude=dist --exclude=.git .", { timeoutMs: 60000 });
    if (tarRes.exitCode !== 0) throw new Error('tar failed: ' + (tarRes.stderr || '').slice(0, 200));
    const bytes = await sbx.files.read('/home/user/snapshot.tar.gz', { format: 'bytes' });
    const path = userId + '/' + taskId + '/snapshot.tar.gz';
    const { error: upErr } = await supabase.storage.from('app-builds').upload(path, new Blob([bytes], { type: 'application/gzip' }), { contentType: 'application/gzip', upsert: true });
    if (upErr) throw new Error('upload failed: ' + upErr.message);
    const { data: t } = await supabase.from('tasks').select('output_data').eq('id', taskId).single();
    await appendLog(supabase, taskId, t?.output_data, { output_data: { snapshot_path: path, snapshot_at: new Date().toISOString() } }, 'Project files saved');
    console.log('[SANDBOX-MANAGER] Snapshot saved:', path);
  } catch (e) {
    console.error('[SANDBOX-MANAGER] Snapshot failed for', taskId, e);
    const { data: t } = await supabase.from('tasks').select('output_data').eq('id', taskId).single();
    await appendLog(supabase, taskId, t?.output_data, {}, 'Snapshot failed (build still usable this session)');
  }
}

async function bootstrapEdit(taskId: string, buildToken: string, prompt: string, model: string, parent: { sandbox_id?: string; snapshot_path?: string; form_key?: string }, ctx: { designMd?: string; marketingMd?: string; knowledgeMd?: string } = {}) {
  const supabase = serviceClient();
  const e2bApiKey = Deno.env.get('E2B_API_KEY') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const formEndpoint = supabaseUrl + '/functions/v1/submit-form';
  const formKey = parent.form_key || ('fk_' + Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => b.toString(16).padStart(2, '0')).join(''));

  const readTask = async () => {
    const { data } = await supabase.from('tasks').select('output_data,status').eq('id', taskId).single();
    return data;
  };

  const framedPrompt = 'You are UPDATING an existing app that was previously built. The full project already exists at /home/user/app. Start by reading PLAN.md (and TODO.md if it exists) to respect the original design decisions — do NOT change palette, fonts or radius unless the change request explicitly asks for it. Then call list_files and read the files relevant to the request before changing anything. Use replace_in_file for targeted edits where possible. Track your work with update_todos as you go. After your changes, run check_build until it passes, then call finish.\n\nUser change request: ' + prompt;

  let sandbox: Sandbox | null = null;
  let reused = false;
  try {
    let task = await readTask();
    let od = task?.output_data;

    if (parent.sandbox_id) {
      try {
        sandbox = await Sandbox.connect(parent.sandbox_id, { apiKey: e2bApiKey });
        await sandbox.setTimeout(SANDBOX_TIMEOUT_MS);
        reused = true;
        // Overwrite runner so newer system-prompt / tools take effect on warm sandboxes.
        try { await sandbox.files.write([{ path: '/home/user/runner.cjs', data: renderRunnerSource() }]); } catch (_) { /* ignore */ }
        od = await appendLog(supabase, taskId, od, { output_data: { sandbox_id: parent.sandbox_id, phase: 'reusing_sandbox' } }, 'Reusing live sandbox (fast edit)');
      } catch (_) {
        sandbox = null;
      }
    }

    if (!sandbox) {
      if (!parent.snapshot_path) throw new Error('No live sandbox and no snapshot to restore from');
      od = await appendLog(supabase, taskId, od, { output_data: { phase: 'creating_sandbox' } }, 'Creating sandbox');
      sandbox = await Sandbox.create('base', { apiKey: e2bApiKey, timeoutMs: SANDBOX_TIMEOUT_MS, metadata: { taskId, app: 'garlicbread-build' } });
      od = await appendLog(supabase, taskId, od, { output_data: { sandbox_id: sandbox.sandboxId, phase: 'restoring_files' } }, 'Restoring saved project files');
      const { data: blob, error: dlErr } = await supabase.storage.from('app-builds').download(parent.snapshot_path);
      if (dlErr || !blob) throw new Error('Snapshot download failed: ' + (dlErr?.message || 'no data'));
      await sandbox.files.write([
        { path: '/home/user/restore.tar.gz', data: blob },
        { path: '/home/user/runner.cjs', data: renderRunnerSource() },
      ]);
      const untar = await sandbox.commands.run('mkdir -p /home/user/app && cd /home/user/app && tar -xzf /home/user/restore.tar.gz', { timeoutMs: 60000 });
      if (untar.exitCode !== 0) throw new Error('Restore failed: ' + (untar.stderr || '').slice(0, 300));
      od = await appendLog(supabase, taskId, od, { output_data: { phase: 'installing_deps' } }, 'Installing dependencies (npm install)');
      const install = await sandbox.commands.run('cd /home/user/app && npm install --no-audit --no-fund', { timeoutMs: 240000 });
      if (install.exitCode !== 0) throw new Error('npm install failed: ' + (install.stderr || install.stdout || '').slice(0, 500));
      od = await appendLog(supabase, taskId, od, { output_data: { phase: 'starting_dev_server' } }, 'Starting dev server');
      await sandbox.commands.run('cd /home/user/app && nohup npm run dev > /home/user/dev-server.log 2>&1 &', { timeoutMs: 15000 });
    }

    const host = sandbox.getHost(DEV_PORT);
    const previewUrl = 'https://' + host;
    od = await appendLog(supabase, taskId, od, { output_data: { preview_url: previewUrl, phase: 'starting_agent' } }, 'Preview live at ' + previewUrl);

    const callbackUrl = supabaseUrl + '/functions/v1/sandbox-manager';
    const proxyUrl = supabaseUrl + '/functions/v1/anthropic-proxy';
    const promptB64 = btoa(unescape(encodeURIComponent(framedPrompt)));
    const designB64 = btoa(unescape(encodeURIComponent(ctx.designMd || '')));
    const marketingB64 = btoa(unescape(encodeURIComponent(ctx.marketingMd || '')));
    const knowledgeB64 = btoa(unescape(encodeURIComponent(ctx.knowledgeMd || '')));

    await sandbox.commands.run('nohup node /home/user/runner.cjs > /home/user/runner.log 2>&1 &', {
      timeoutMs: 15000,
      envs: { TASK_ID: taskId, BUILD_TOKEN: buildToken, CALLBACK_URL: callbackUrl, PROXY_URL: proxyUrl, MODEL: model, PROMPT_B64: promptB64, PREVIEW_URL: previewUrl, DESIGN_MD_B64: designB64, MARKETING_MD_B64: marketingB64, KNOWLEDGE_MD_B64: knowledgeB64, IS_EDIT: '1', FORM_KEY: formKey, FORM_ENDPOINT_URL: formEndpoint },
    });

    await appendLog(supabase, taskId, od, { status: 'running', output_data: { phase: 'agent_running', reused_sandbox: reused, form_key: formKey } }, 'Edit agent launched');
  } catch (err) {
    console.error('[SANDBOX-MANAGER] Edit bootstrap failed:', err);
    const task = await readTask();
    await appendLog(supabase, taskId, task?.output_data, {
      status: 'failed',
      error_message: 'Edit bootstrap failed: ' + (err instanceof Error ? err.message : String(err)).slice(0, 500),
      completed_at: new Date().toISOString(),
    }, 'Edit bootstrap failed');
    if (sandbox && !reused) { try { await sandbox.kill(); } catch (_) { /* ignore */ } }
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
      const { taskId, token, status, step, log, summary, files_changed, error, todos } = body;
      if (!taskId || !token) {
        return new Response(JSON.stringify({ error: 'Missing taskId or token' }), { status: 400, headers: jsonHeaders });
      }
      const supabase = serviceClient();
      const { data: task } = await supabase.from('tasks').select('output_data,status,task_type,user_id').eq('id', taskId).single();
      if (!task || task.task_type !== 'app_build' || task.output_data?.build_token !== token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
      }
      if (['completed', 'failed', 'stopped', 'completed_partial'].includes(task.status)) {
        return new Response(JSON.stringify({ ok: true, note: 'terminal' }), { headers: jsonHeaders });
      }

      const fields: Record<string, any> = { output_data: {} };
      if (step) fields.output_data.current_step = String(step).slice(0, 200);
      if (summary) fields.output_data.summary = summary;
      if (typeof files_changed === 'number') fields.output_data.files_changed = files_changed;
      if (Array.isArray(todos)) fields.output_data.todos = todos.slice(0, 60);
      if (status === 'completed') {
        fields.status = 'completed';
        fields.completed_at = new Date().toISOString();
        fields.output_data.qa_pending = true;
      } else if (status === 'completed_partial') {
        fields.status = 'completed_partial';
        fields.completed_at = new Date().toISOString();
        fields.output_data.needs_continue = true;
      } else if (status === 'failed') {
        fields.status = 'failed';
        fields.error_message = (error || 'Build failed').slice(0, 500);
        fields.completed_at = new Date().toISOString();
      } else if (status === 'running') {
        fields.status = 'running';
      }

      await appendLog(supabase, taskId, task.output_data, fields, log);
      if ((status === 'completed' || status === 'failed' || status === 'completed_partial') && task.output_data?.sandbox_id && task.user_id) {
        const snapPromise = snapshotSandbox(taskId, task.user_id, task.output_data.sandbox_id);
        // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
        if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
          // @ts-ignore
          EdgeRuntime.waitUntil(snapPromise);
        } else {
          snapPromise.catch((e) => console.error('[SANDBOX-MANAGER] snapshot background error:', e));
        }
      }
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
      const designMd = typeof body.designMd === 'string' ? body.designMd.slice(0, 8000) : '';
      const marketingMd = typeof body.marketingMd === 'string' ? body.marketingMd.slice(0, 8000) : '';
      if (!prompt || prompt.length < 10) {
        return new Response(JSON.stringify({ error: 'Prompt is required (min 10 chars)' }), { status: 400, headers: jsonHeaders });
      }

      // Atomic app_build quota gate — check + increment in one transaction.
      const { data: quota, error: quotaErr } = await supabase.rpc('check_and_increment_usage', { p_user_id: user.id, p_usage_type: 'app_build' });
      if (quotaErr) {
        return new Response(JSON.stringify({ error: 'Unable to check quota' }), { status: 500, headers: jsonHeaders });
      }
      if (quota && (quota as any).allowed === false) {
        const q = quota as any;
        return new Response(JSON.stringify({ error: 'quota_exceeded', message: `Monthly app build limit reached (${q.used}/${q.limit}). Please upgrade your plan.`, limit_exceeded: true, used: q.used, limit: q.limit }), { status: 402, headers: jsonHeaders });
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
          input_data: { prompt: prompt.slice(0, 5000), model, has_design_md: !!designMd, has_marketing_md: !!marketingMd },
          output_data: { build_token: buildToken, log: [], phase: 'queued' },
        })
        .select()
        .single();

      if (taskError || !taskRecord) {
        return new Response(JSON.stringify({ error: 'Failed to create build record' }), { status: 500, headers: jsonHeaders });
      }

      // Backfill the task_id on the usage row we just inserted atomically.
      await supabase.from('usage_tracking').update({ task_id: taskRecord.id })
        .eq('user_id', user.id).eq('usage_type', 'app_build').is('task_id', null)
        .order('created_at', { ascending: false }).limit(1);

      const { knowledgeMd } = await loadUserContextForBuild(supabase, user.id);
      const bootstrapPromise = bootstrapBuild(taskRecord.id, buildToken, prompt, model, { designMd, marketingMd, knowledgeMd });
      // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(bootstrapPromise);
      } else {
        bootstrapPromise.catch((e) => console.error('[SANDBOX-MANAGER] background error:', e));
      }

      return new Response(JSON.stringify({ taskId: taskRecord.id, status: 'initializing' }), { headers: jsonHeaders });
    }

    if (action === 'edit') {
      const prompt = (body.prompt || '').trim();
      const model = ['claude-sonnet-4-6', 'claude-fable-5'].includes(body.model) ? body.model : 'claude-sonnet-4-6';
      const designMd = typeof body.designMd === 'string' ? body.designMd.slice(0, 8000) : '';
      const marketingMd = typeof body.marketingMd === 'string' ? body.marketingMd.slice(0, 8000) : '';
      const parentTaskId = body.taskId;
      if (!prompt || prompt.length < 5) {
        return new Response(JSON.stringify({ error: 'Edit prompt is required' }), { status: 400, headers: jsonHeaders });
      }
      if (!parentTaskId) {
        return new Response(JSON.stringify({ error: 'taskId of the build to edit is required' }), { status: 400, headers: jsonHeaders });
      }
      const { data: parent } = await supabase.from('tasks').select('*').eq('id', parentTaskId).eq('user_id', user.id).single();
      if (!parent || parent.task_type !== 'app_build') {
        return new Response(JSON.stringify({ error: 'Build not found' }), { status: 404, headers: jsonHeaders });
      }
      if (!parent.output_data?.sandbox_id && !parent.output_data?.snapshot_path) {
        return new Response(JSON.stringify({ error: 'This build has no saved files to resume from' }), { status: 409, headers: jsonHeaders });
      }

      const { data: quota, error: quotaErr } = await supabase.rpc('check_and_increment_usage', { p_user_id: user.id, p_usage_type: 'app_build' });
      if (quotaErr) {
        return new Response(JSON.stringify({ error: 'Unable to check quota' }), { status: 500, headers: jsonHeaders });
      }
      if (quota && (quota as any).allowed === false) {
        const q = quota as any;
        return new Response(JSON.stringify({ error: 'quota_exceeded', message: `Monthly app build limit reached (${q.used}/${q.limit}). Please upgrade your plan.`, limit_exceeded: true, used: q.used, limit: q.limit }), { status: 402, headers: jsonHeaders });
      }

      const buildToken = generateToken();
      const { data: taskRecord, error: taskError } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          project_id: parent.project_id || null,
          task_type: 'app_build',
          status: 'initializing',
          started_at: new Date().toISOString(),
          input_data: { prompt: prompt.slice(0, 5000), model, parent_task_id: parentTaskId, edit: true },
          output_data: { build_token: buildToken, log: [], phase: 'queued', parent_task_id: parentTaskId },
        })
        .select()
        .single();

      if (taskError || !taskRecord) {
        return new Response(JSON.stringify({ error: 'Failed to create edit record' }), { status: 500, headers: jsonHeaders });
      }

      await supabase.from('usage_tracking').update({ task_id: taskRecord.id })
        .eq('user_id', user.id).eq('usage_type', 'app_build').is('task_id', null)
        .order('created_at', { ascending: false }).limit(1);

      const { knowledgeMd } = await loadUserContextForBuild(supabase, user.id);
      const editPromise = bootstrapEdit(taskRecord.id, buildToken, prompt, model, {
        sandbox_id: parent.output_data?.sandbox_id,
        snapshot_path: parent.output_data?.snapshot_path,
        form_key: parent.output_data?.form_key,
      }, { designMd, marketingMd, knowledgeMd });
      // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(editPromise);
      } else {
        editPromise.catch((e) => console.error('[SANDBOX-MANAGER] edit background error:', e));
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
        try { await snapshotSandbox(taskId, user.id, sandboxId); } catch (_) { /* best-effort snapshot before kill */ }
      }
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

    if (action === 'attach_qa') {
      // Client-side QA runner tells us the browser-task id it kicked off (and, when ready, the report).
      const { taskId, qaTaskId, report } = body;
      const { data: task } = await supabase.from('tasks').select('output_data').eq('id', taskId).eq('user_id', user.id).single();
      if (!task) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: jsonHeaders });
      const fields: Record<string, any> = { output_data: {} };
      if (qaTaskId) fields.output_data.qa_task_id = qaTaskId;
      if (report) fields.output_data.qa_report = String(report).slice(0, 20000);
      fields.output_data.qa_pending = false;
      await appendLog(supabase, taskId, task.output_data, fields, report ? 'QA report attached' : 'QA dispatched');
      return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
    }

    if (action === 'publish' || action === 'unpublish' || action === 'export') {
      const { taskId } = body;
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).eq('user_id', user.id).single();
      if (!task) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: jsonHeaders });
      if (task.task_type !== 'app_build') return new Response(JSON.stringify({ error: 'Not an app build' }), { status: 400, headers: jsonHeaders });
      if (!['completed', 'completed_partial'].includes(task.status)) {
        return new Response(JSON.stringify({ error: 'Build must be complete before ' + action }), { status: 409, headers: jsonHeaders });
      }

      // Locate the existing published_app in this task chain, if any.
      async function findExistingApp(): Promise<any | null> {
        let cursor: any = task;
        for (let i = 0; i < 20 && cursor; i++) {
          const pid = cursor.output_data?.published_app_id;
          if (pid) {
            const { data } = await supabase.from('published_apps').select('*').eq('id', pid).eq('user_id', user.id).maybeSingle();
            if (data) return data;
          }
          const parentId = cursor.input_data?.parent_task_id || cursor.output_data?.parent_task_id;
          if (!parentId) break;
          const { data: p } = await supabase.from('tasks').select('*').eq('id', parentId).eq('user_id', user.id).maybeSingle();
          cursor = p;
        }
        // Also look up by task_id foreign key
        const { data: byTask } = await supabase.from('published_apps').select('*').eq('user_id', user.id).eq('task_id', task.id).maybeSingle();
        return byTask || null;
      }

      if (action === 'unpublish') {
        const existing = await findExistingApp();
        if (!existing) return new Response(JSON.stringify({ error: 'Not published' }), { status: 404, headers: jsonHeaders });
        await supabase.from('published_apps').update({ is_published: false }).eq('id', existing.id);
        await appendLog(supabase, taskId, task.output_data, {}, 'Unpublished ' + existing.slug);
        return new Response(JSON.stringify({ ok: true, slug: existing.slug }), { headers: jsonHeaders });
      }

      // publish + export both need a live sandbox with the project restored.
      const e2bApiKey = Deno.env.get('E2B_API_KEY') ?? '';
      let sandbox: Sandbox | null = null;
      let createdSandbox = false;
      try {
        if (task.output_data?.sandbox_id) {
          try {
            sandbox = await Sandbox.connect(task.output_data.sandbox_id, { apiKey: e2bApiKey });
            await sandbox.setTimeout(SANDBOX_TIMEOUT_MS);
          } catch (_) { sandbox = null; }
        }
        if (!sandbox) {
          if (!task.output_data?.snapshot_path) {
            return new Response(JSON.stringify({ error: 'No snapshot available for this build' }), { status: 409, headers: jsonHeaders });
          }
          sandbox = await Sandbox.create('base', { apiKey: e2bApiKey, timeoutMs: SANDBOX_TIMEOUT_MS, metadata: { taskId, app: 'garlicbread-build', mode: action } });
          createdSandbox = true;
          const { data: blob, error: dlErr } = await supabase.storage.from('app-builds').download(task.output_data.snapshot_path);
          if (dlErr || !blob) throw new Error('Snapshot download failed: ' + (dlErr?.message || 'no data'));
          await sandbox.files.write([{ path: '/home/user/restore.tar.gz', data: blob }]);
          const untar = await sandbox.commands.run('mkdir -p /home/user/app && cd /home/user/app && tar -xzf /home/user/restore.tar.gz', { timeoutMs: 60000 });
          if (untar.exitCode !== 0) throw new Error('Restore failed: ' + (untar.stderr || '').slice(0, 300));
          if (action === 'publish') {
            const install = await sandbox.commands.run('cd /home/user/app && npm install --no-audit --no-fund', { timeoutMs: 240000 });
            if (install.exitCode !== 0) throw new Error('npm install failed: ' + (install.stderr || install.stdout || '').slice(0, 500));
          }
        }

        if (action === 'export') {
          const zipRes = await sandbox.commands.run(
            "cd /home/user/app && (which zip >/dev/null 2>&1 || (apt-get update -qq && apt-get install -y -qq zip)) && rm -f /home/user/export.zip && zip -r /home/user/export.zip . -x 'node_modules/*' 'dist/*' '.git/*'",
            { timeoutMs: 120000 },
          );
          if (zipRes.exitCode !== 0) throw new Error('zip failed: ' + (zipRes.stderr || '').slice(0, 300));
          const bytes = await sandbox.files.read('/home/user/export.zip', { format: 'bytes' });
          const exportPath = `${user.id}/${task.id}/exports/${Date.now()}.zip`;
          const { error: upErr } = await supabase.storage.from('app-builds').upload(exportPath, new Blob([bytes], { type: 'application/zip' }), { contentType: 'application/zip', upsert: true });
          if (upErr) throw new Error('Upload failed: ' + upErr.message);
          const { data: signed, error: signErr } = await supabase.storage.from('app-builds').createSignedUrl(exportPath, 600);
          if (signErr || !signed) throw new Error('Signed URL failed: ' + (signErr?.message || 'unknown'));
          if (createdSandbox) { try { await sandbox.kill(); } catch (_) { /* ignore */ } }
          return new Response(JSON.stringify({ url: signed.signedUrl, expiresIn: 600 }), { headers: jsonHeaders });
        }

        // action === 'publish'
        // Ensure vite base is './' so assets resolve under /{slug}/
        await sandbox.files.write([{ path: '/home/user/app/vite.config.js', data: FILE_VITE_CONFIG }]);
        const buildRes = await sandbox.commands.run('cd /home/user/app && npx vite build --logLevel error', { timeoutMs: 240000 });
        if (buildRes.exitCode !== 0) {
          throw new Error('Production build failed: ' + ((buildRes.stderr || buildRes.stdout || '').slice(0, 500)));
        }

        // List dist files
        const listRes = await sandbox.commands.run("cd /home/user/app/dist && find . -type f -printf '%P\\n'", { timeoutMs: 30000 });
        if (listRes.exitCode !== 0) throw new Error('Failed to list dist: ' + (listRes.stderr || '').slice(0, 200));
        const files = String(listRes.stdout || '').split('\n').map((s) => s.trim()).filter(Boolean);
        if (files.length === 0) throw new Error('Build produced no files');

        const existing = await findExistingApp();
        const nextVersion = (existing?.version || 0) + 1;
        let slug = existing?.slug;
        let appId = existing?.id;

        if (!slug) {
          const namePart = (task.input_data?.prompt || 'app')
            .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'app';
          for (let i = 0; i < 6; i++) {
            const rand = Math.random().toString(36).slice(2, 8);
            const candidate = `${namePart}-${rand}`.slice(0, 60);
            const { data: clash } = await supabase.from('published_apps').select('id').eq('slug', candidate).maybeSingle();
            if (!clash) { slug = candidate; break; }
          }
          if (!slug) throw new Error('Could not generate unique slug');
        }

        const storagePrefix = `${user.id}/apps/${slug}/v${nextVersion}`;

        // Upload dist files
        for (const rel of files) {
          const src = '/home/user/app/dist/' + rel;
          const bytes = await sandbox.files.read(src, { format: 'bytes' });
          const dest = `${storagePrefix}/${rel}`;
          const ext = rel.split('.').pop()?.toLowerCase() || '';
          const mime = ({ html: 'text/html; charset=utf-8', js: 'application/javascript; charset=utf-8', css: 'text/css; charset=utf-8', json: 'application/json; charset=utf-8', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', ico: 'image/x-icon', woff2: 'font/woff2', woff: 'font/woff', txt: 'text/plain; charset=utf-8', map: 'application/json; charset=utf-8' } as Record<string, string>)[ext] || 'application/octet-stream';
          const { error: upErr } = await supabase.storage.from('app-builds').upload(dest, new Blob([bytes], { type: mime }), { contentType: mime, upsert: true });
          if (upErr) throw new Error('Upload failed for ' + rel + ': ' + upErr.message);
        }

        // Upsert published_apps row
        const namePretty = (task.input_data?.prompt || 'Untitled app').slice(0, 80);
        if (appId) {
          await supabase.from('published_apps').update({
            task_id: task.id,
            version: nextVersion,
            storage_prefix: storagePrefix,
            is_published: true,
            name: existing.name || namePretty,
          }).eq('id', appId);
        } else {
          const { data: inserted, error: insErr } = await supabase.from('published_apps').insert({
            user_id: user.id, task_id: task.id, name: namePretty, slug, storage_prefix: storagePrefix, version: nextVersion, is_published: true,
            ...(task.output_data?.form_key ? { form_key: task.output_data.form_key } : {}),
          }).select().single();
          if (insErr || !inserted) throw new Error('Failed to record published app: ' + (insErr?.message || 'unknown'));
          appId = inserted.id;
        }

        // Remember the published_app_id on the task so subsequent republishes find it
        await appendLog(supabase, taskId, task.output_data, {
          output_data: { published_app_id: appId, published_slug: slug, published_version: nextVersion, published_at: new Date().toISOString() },
        }, 'Published as ' + slug + ' v' + nextVersion + ' (' + files.length + ' files)');

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const publicUrl = `${supabaseUrl}/functions/v1/serve-app/${slug}/`;

        if (createdSandbox) { try { await sandbox.kill(); } catch (_) { /* ignore */ } }

        return new Response(JSON.stringify({ ok: true, slug, version: nextVersion, url: publicUrl, appId }), { headers: jsonHeaders });
      } catch (err) {
        if (createdSandbox && sandbox) { try { await sandbox.kill(); } catch (_) { /* ignore */ } }
        console.error('[SANDBOX-MANAGER] ' + action + ' failed:', err);
        return new Response(JSON.stringify({ error: (err instanceof Error ? err.message : String(err)).slice(0, 500) }), { status: 500, headers: jsonHeaders });
      }
    }

    if (action === 'versions') {
      // Walk the parent chain to find the root of this lineage, then return every
      // build in the same chain (root + descendants) so the UI can show version history.
      const startId = body.taskId;
      if (!startId) return new Response(JSON.stringify({ error: 'taskId required' }), { status: 400, headers: jsonHeaders });
      const { data: startTask } = await supabase.from('tasks').select('*').eq('id', startId).eq('user_id', user.id).maybeSingle();
      if (!startTask) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: jsonHeaders });

      let rootId = startTask.id;
      let cursor: any = startTask;
      for (let i = 0; i < 40; i++) {
        const parentId = cursor?.input_data?.parent_task_id || cursor?.output_data?.parent_task_id;
        if (!parentId) { rootId = cursor.id; break; }
        const { data: p } = await supabase.from('tasks').select('*').eq('id', parentId).eq('user_id', user.id).maybeSingle();
        if (!p) { rootId = cursor.id; break; }
        cursor = p;
        rootId = p.id;
      }

      // Collect every user app_build task and keep those whose ancestor chain contains rootId.
      const { data: all } = await supabase
        .from('tasks')
        .select('id, status, completed_at, created_at, input_data, output_data')
        .eq('user_id', user.id)
        .eq('task_type', 'app_build')
        .order('created_at', { ascending: false })
        .limit(200);
      const byId = new Map<string, any>();
      for (const t of (all || [])) byId.set(t.id, t);
      const inLineage = (t: any): boolean => {
        let c: any = t;
        for (let i = 0; i < 40 && c; i++) {
          if (c.id === rootId) return true;
          const pid = c?.input_data?.parent_task_id || c?.output_data?.parent_task_id;
          if (!pid) return false;
          c = byId.get(pid);
        }
        return false;
      };
      const versions = (all || []).filter(inLineage).map((t: any) => ({
        id: t.id,
        status: t.status,
        created_at: t.created_at,
        completed_at: t.completed_at,
        prompt: t.input_data?.prompt || '',
        edit: !!t.input_data?.edit,
        parent_task_id: t.input_data?.parent_task_id || t.output_data?.parent_task_id || null,
        has_snapshot: !!t.output_data?.snapshot_path,
        preview_url: t.output_data?.preview_url || null,
      }));
      return new Response(JSON.stringify({ rootId, versions }), { headers: jsonHeaders });
    }

    if (action === 'restore') {
      // Relaunch a sandbox from a saved snapshot as a brand new edit lineage entry.
      // Uses the atomic edit path with a "no-op" prompt so the model just re-verifies.
      const parentTaskId = body.taskId;
      const model = ['claude-sonnet-4-6', 'claude-fable-5'].includes(body.model) ? body.model : 'claude-sonnet-4-6';
      if (!parentTaskId) return new Response(JSON.stringify({ error: 'taskId required' }), { status: 400, headers: jsonHeaders });
      const { data: parent } = await supabase.from('tasks').select('*').eq('id', parentTaskId).eq('user_id', user.id).single();
      if (!parent || parent.task_type !== 'app_build') return new Response(JSON.stringify({ error: 'Build not found' }), { status: 404, headers: jsonHeaders });
      if (!parent.output_data?.snapshot_path) return new Response(JSON.stringify({ error: 'This version has no saved snapshot to restore from' }), { status: 409, headers: jsonHeaders });

      const { data: quota, error: quotaErr } = await supabase.rpc('check_and_increment_usage', { p_user_id: user.id, p_usage_type: 'app_build' });
      if (quotaErr) return new Response(JSON.stringify({ error: 'Unable to check quota' }), { status: 500, headers: jsonHeaders });
      if (quota && (quota as any).allowed === false) {
        const q = quota as any;
        return new Response(JSON.stringify({ error: 'quota_exceeded', message: `Monthly app build limit reached (${q.used}/${q.limit}).`, limit_exceeded: true }), { status: 402, headers: jsonHeaders });
      }

      const restorePrompt = 'RESTORE VERSION: The saved project files have been restored. Do not modify any files. Just run check_build to confirm it still compiles, add a DECISIONS.md entry titled `## <today> — Restored earlier version` noting which version was restored, then call finish immediately.';
      const buildToken = generateToken();
      const { data: taskRecord, error: taskError } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          project_id: parent.project_id || null,
          task_type: 'app_build',
          status: 'initializing',
          started_at: new Date().toISOString(),
          input_data: { prompt: 'Restore earlier version', model, parent_task_id: parentTaskId, edit: true, restore: true },
          output_data: { build_token: buildToken, log: [], phase: 'queued', parent_task_id: parentTaskId },
        })
        .select()
        .single();
      if (taskError || !taskRecord) return new Response(JSON.stringify({ error: 'Failed to create restore record' }), { status: 500, headers: jsonHeaders });

      await supabase.from('usage_tracking').update({ task_id: taskRecord.id })
        .eq('user_id', user.id).eq('usage_type', 'app_build').is('task_id', null)
        .order('created_at', { ascending: false }).limit(1);

      const { knowledgeMd } = await loadUserContextForBuild(supabase, user.id);
      // Force snapshot-based restore (do not reuse a warm sandbox from parent — restore semantics require the exact files).
      const editPromise = bootstrapEdit(taskRecord.id, buildToken, restorePrompt, model, {
        snapshot_path: parent.output_data?.snapshot_path,
        form_key: parent.output_data?.form_key,
      }, { knowledgeMd });
      // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(editPromise);
      } else {
        editPromise.catch((e) => console.error('[SANDBOX-MANAGER] restore background error:', e));
      }

      return new Response(JSON.stringify({ taskId: taskRecord.id, status: 'initializing' }), { headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: jsonHeaders });
  } catch (error) {
    console.error('[SANDBOX-MANAGER] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: jsonHeaders });
  }
});
