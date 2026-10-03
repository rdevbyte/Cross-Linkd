/**
 * Cross-site request protection for state-changing requests.
 *
 * Astro's built-in `security.checkOrigin` is switched off in astro.config.mjs in favour of this
 * exact-host allow-list (it also has to accept the configured public site, the production
 * domains and Vercel preview hosts).
 *
 * Browsers send `Origin` on every cross-site POST, so a present-but-foreign Origin is a CSRF
 * attempt. When `Origin` is absent, `Sec-Fetch-Site: cross-site` (sent by every current browser
 * on cross-site requests) is treated the same way — previously such a request slipped through.
 * Non-browser clients (curl, server-to-server) send neither header and are not affected;
 * they cannot ride a victim's cookies, and session cookies are SameSite=Lax.
 */
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Allowed: the request's own host (covers custom domains *and* Vercel preview URLs, which
 * serve from the same host they were loaded from), the configured public site,
 * the known production domains, and loopback outside production.
 */
export function originAllowed(origin: string, host: string): boolean {
  let originHost: string;
  let originHostname: string;
  try {
    const url = new URL(origin);
    originHost = url.host.toLowerCase();
    originHostname = url.hostname.toLowerCase();
  } catch {
    return false; // includes the literal `Origin: null` sent from sandboxed contexts
  }
  if (originHost === host.toLowerCase()) return true;
  const site = process.env.PUBLIC_SITE_URL?.trim();
  if (site) {
    try {
      if (new URL(site.startsWith('http') ? site : `https://${site}`).host.toLowerCase() === originHost) return true;
    } catch { /* ignore malformed PUBLIC_SITE_URL */ }
  }
  if (originHost === 'crosslinkd.com' || originHost === 'www.crosslinkd.com' || originHost === 'cross-linkd.vercel.app') return true;
  if (process.env.NODE_ENV !== 'production' && LOOPBACK.has(originHostname)) return true;
  return false;
}

/** True when a mutating request must be rejected as cross-site. */
export function isCrossSiteWrite(method: string, headers: Headers): boolean {
  if (!MUTATING.has(method.toUpperCase())) return false;
  const origin = headers.get('origin');
  if (origin) {
    const host = headers.get('host');
    return Boolean(host) && !originAllowed(origin, host as string);
  }
  return headers.get('sec-fetch-site') === 'cross-site';
}
