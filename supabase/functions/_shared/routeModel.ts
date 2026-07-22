// Heuristic router: pick a fast model for trivial conversational turns,
// and the full chat model for anything that looks like code generation,
// site/page building, or iterative edits. Pure function, no I/O.
import { MODELS } from "./config.ts";

const BUILD_KEYWORDS = [
  'build', 'create', 'make', 'generate', 'design', 'redesign',
  'landing', 'page', 'site', 'website', 'funnel', 'hero',
  'section', 'form', 'app', 'component', 'layout', 'template',
  'edit', 'change', 'update', 'add', 'remove', 'replace',
  'fix', 'refactor', 'style', 'color', 'palette', 'font',
  'html', 'css', 'javascript', 'tailwind', 'ghl',
];

function extractLatestUserText(messages: any[]): string {
  if (!Array.isArray(messages) || messages.length === 0) return '';
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m || m.role !== 'user') continue;
    if (typeof m.content === 'string') return m.content;
    if (Array.isArray(m.content)) {
      const t = m.content.find((b: any) => b && b.type === 'text');
      if (t?.text) return t.text;
    }
  }
  return '';
}

export function routeChatModel(messages: any[], opts?: {
  ghlMode?: boolean;
  hasDesignMd?: boolean;
  hasMarketingMd?: boolean;
}): string {
  // Any explicit design/marketing/GHL context → this is a build request.
  if (opts?.ghlMode || opts?.hasDesignMd || opts?.hasMarketingMd) return MODELS.CHAT;

  const latest = extractLatestUserText(messages).trim();
  if (!latest) return MODELS.CHAT;

  // Iterative editing signal — always full model.
  if (/CURRENT (HTML|CSS|JAVASCRIPT):/i.test(latest)) return MODELS.CHAT;
  if (/```/.test(latest)) return MODELS.CHAT;

  // Long messages likely carry build intent.
  if (latest.length > 320) return MODELS.CHAT;

  const lower = latest.toLowerCase();
  for (const kw of BUILD_KEYWORDS) {
    // word-boundary-ish check to avoid false positives inside URLs
    const re = new RegExp(`(^|[^a-z])${kw}([^a-z]|$)`);
    if (re.test(lower)) return MODELS.CHAT;
  }

  // Short, keyword-free conversational turn → fast model.
  return MODELS.CHAT_FAST;
}