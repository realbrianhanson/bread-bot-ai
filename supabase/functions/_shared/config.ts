// Centralized configuration for all edge functions.
// Update here rather than in individual functions.

export const BRAND_NAME = 'GarlicBread.ai';

// External API base URLs
export const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
export const OPENAI_API_URL = 'https://api.openai.com/v1';
export const BROWSER_USE_API_URL = 'https://api.browser-use.com/api/v3';
export const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v2';
export const HONCHO_API_URL = 'https://api.honcho.dev/v1';
export const RESEND_GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';

// Model identifiers
export const MODELS = {
  // Main chat model (upgraded)
  CHAT: 'claude-sonnet-5',
  // Fast classifier / short tasks
  CLASSIFIER: 'claude-haiku-4-5-20251001',
  // App builder / creative
  BUILDER_FAST: 'claude-sonnet-4-6',
  BUILDER_QUALITY: 'claude-fable-5',
  // Orchestrator (multi-tool reasoning). Primary + fallback (fallback used on 'refusal' stop_reason)
  ORCHESTRATOR: 'claude-fable-5',
  ORCHESTRATOR_FALLBACK: 'claude-opus-4-8',
  // Browser Use v3
  BROWSER_USE: 'bu-ultra',
  // Whisper replacement
  TRANSCRIBE: 'gpt-4o-mini-transcribe',
} as const;

// Timeouts (ms)
export const TIMEOUT_AI_MS = 90_000;
export const TIMEOUT_DEFAULT_MS = 30_000;

/**
 * fetch wrapper that adds an AbortController timeout.
 * Returns a Response or throws a DOMException named 'AbortError'.
 */
export async function fetchWithTimeout(
  input: string | URL | Request,
  init: RequestInit = {},
  timeoutMs: number = TIMEOUT_DEFAULT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const signal = init.signal
    ? anySignal([init.signal, controller.signal])
    : controller.signal;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal });
  } finally {
    clearTimeout(timer);
  }
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  for (const s of signals) {
    if (s.aborted) { controller.abort(); break; }
    s.addEventListener('abort', onAbort, { once: true });
  }
  return controller.signal;
}

/** Build a JSON error response tagged as timeout. */
export function timeoutErrorResponse(corsHeaders: Record<string, string>, message = 'Upstream request timed out') {
  return new Response(JSON.stringify({ error: 'timeout', message }), {
    status: 504,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function isAbortError(err: unknown): boolean {
  return err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');
}