// Shared AES-GCM encryption helpers for stored API keys.
// The encryption key is derived from ENCRYPTION_KEY (dedicated secret).
// There is NO legacy plaintext fallback: rows must be encrypted.

const RAW = Deno.env.get('ENCRYPTION_KEY');

async function getKey(): Promise<CryptoKey> {
  if (!RAW) throw new Error('ENCRYPTION_KEY is not configured');
  const bytes = new TextEncoder().encode(RAW);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return `${btoa(String.fromCharCode(...iv))}:${btoa(String.fromCharCode(...new Uint8Array(ct)))}`;
}

export async function decryptSecret(encrypted: string): Promise<string> {
  if (!encrypted.includes(':')) {
    // No plaintext fallback — reject legacy rows explicitly.
    throw new Error('Stored key is in an unsupported format; please re-enter it in Settings.');
  }
  const key = await getKey();
  const [ivB64, ctB64] = encrypted.split(':');
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}

/** Mask a key for read APIs — reveals only the last 4 characters. */
export function maskKey(plaintext: string): string {
  if (!plaintext) return '';
  if (plaintext.length <= 4) return '••••';
  return `••••${plaintext.slice(-4)}`;
}