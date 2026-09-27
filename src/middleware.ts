import { defineMiddleware } from 'astro:middleware';
import { eq } from 'drizzle-orm';
import { SESSION_COOKIE, isSessionRevoked, readSessionToken } from '@/lib/auth';
import { getDb } from '@/db/client';
import { users } from '@/db/schema';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Origin allow-list for mutating requests. A browser always sends `Origin` on
 * cross-site POSTs, so a present-but-foreign Origin is a CSRF attempt. Allowed:
 * the request's own host (covers custom domains *and* Vercel preview URLs, which
 * serve from the same host they were loaded from), the configured public site,
 * the known production domains, and loopback outside production.
 */
function originAllowed(origin: string, host: string): boolean {
  let originHost: string;
  let originHostname: string;
  try {
    const url = new URL(origin);
    originHost = url.host.toLowerCase();
    originHostname = url.hostname.toLowerCase();
  } catch {
    return false;
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

/**
 * Attaches `locals.user` for every request (null when signed out).
 * Also performs origin verification on mutating requests (POST, PUT, PATCH, DELETE)
 * and rejects sessions that were revoked (sign-out / password reset / role change)
 * or whose account has been deleted.
 */
export const onRequest = defineMiddleware(async ({ cookies, locals, request }, next) => {
  // CSRF Origin verification for mutating requests
  if (MUTATING.has(request.method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (origin && host && !originAllowed(origin, host)) {
      return new Response(JSON.stringify({ ok: false, error: 'Cross-site request blocked.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const token = cookies.get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(token);
  let user: App.Locals['user'] = session;

  if (session) {
    const db = getDb();
    if (db) {
      try {
        const [row] = await db
          .select({ deletedAt: users.deletedAt, sessionsValidAfter: users.sessionsValidAfter })
          .from(users)
          .where(eq(users.id, session.id))
          .limit(1);
        if (!row || row.deletedAt || isSessionRevoked(session.issuedAt, row.sessionsValidAfter)) user = null;
      } catch (err) {
        // Availability over strictness: a transient DB error keeps stateless JWT semantics.
        console.error('[middleware] session check failed:', err instanceof Error ? err.message : err);
      }
    }
  }

  // Drop a cookie that no longer maps to a live session (revoked, deleted, or unverifiable).
  if (token && !user) cookies.delete(SESSION_COOKIE, { path: '/' });
  locals.user = user;
  return next();
});

declare global {
  // eslint-disable-next-line no-unused-vars
  namespace App {
    interface Locals {
      user: { id: string; email: string; displayName: string; role: string } | null;
    }
  }
}
