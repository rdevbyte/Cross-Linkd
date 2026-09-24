import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE, readSessionToken } from '@/lib/auth';

/**
 * Attaches `locals.user` for every request (null when signed out).
 * Also performs origin verification on mutating requests (POST, PUT, PATCH, DELETE)
 * to guard against CSRF while permitting valid Vercel domains, custom domains, and localhost.
 */
export const onRequest = defineMiddleware(async ({ cookies, locals, request }, next) => {
  // CSRF Origin verification for mutating requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        const originHost = originUrl.host.toLowerCase();
        const currentHost = host.toLowerCase();

        // Valid if:
        // 1. Matches current host directly
        // 2. Is on a vercel.app domain (supports project renames, preview branches)
        // 3. Is local dev / localhost
        // 4. Matches known CrossLinkd domains
        const isValid =
          originHost === currentHost ||
          originHost.endsWith('.vercel.app') ||
          originHost.includes('localhost') ||
          originHost.includes('127.0.0.1') ||
          originHost === 'crosslinkd.com' ||
          originHost === 'www.crosslinkd.com' ||
          originHost === 'cross-linkd.vercel.app' ||
          originHost === 'crosslinkd.vercel.app';

        if (!isValid) {
          return new Response(JSON.stringify({ ok: false, error: 'Cross-site request blocked.' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch {
        // malformed origin
        return new Response(JSON.stringify({ ok: false, error: 'Invalid origin header.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }

  const token = cookies.get(SESSION_COOKIE)?.value;
  locals.user = await readSessionToken(token);
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
