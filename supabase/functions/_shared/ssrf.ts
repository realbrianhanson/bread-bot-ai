// SSRF guard for outbound fetches driven by user-controlled URLs.
// - Only allows https://
// - Rejects private / loopback / link-local / ULA hosts by literal check
// - Resolves DNS via DoH and re-checks each answer

export function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  // IPv4
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = +m[1], b = +m[2];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
    if (a >= 224) return true; // multicast + reserved
  }
  // IPv6
  if (h === '::1' || h === '::') return true;
  if (h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd')) return true;
  return false;
}

export function isSafeUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    if (isPrivateHost(u.hostname)) return false;
    return true;
  } catch { return false; }
}

export async function resolvedHostIsSafe(hostname: string): Promise<boolean> {
  try {
    for (const type of ['A', 'AAAA']) {
      const r = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`,
        { headers: { accept: 'application/dns-json' } },
      );
      if (!r.ok) return false;
      const j = await r.json();
      const answers: Array<{ data: string; type: number }> = j.Answer ?? [];
      for (const a of answers) {
        const ip = (a.data || '').trim();
        if (ip && isPrivateHost(ip)) return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/** Full guard: literal + DNS check. Returns null if safe, or error string. */
export async function assertSafeUrl(raw: string): Promise<string | null> {
  if (!isSafeUrl(raw)) return 'URL rejected: must be https and not point to a private host';
  try {
    const u = new URL(raw);
    const ok = await resolvedHostIsSafe(u.hostname);
    if (!ok) return 'URL rejected: hostname resolves to a private/internal address';
  } catch {
    return 'URL rejected: invalid URL';
  }
  return null;
}