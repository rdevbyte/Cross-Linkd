import type { APIRoute } from 'astro';
import { clearSessionCookie, revokeUserSessions } from '@/lib/auth';
import { getDb } from '@/db/client';
import { users } from '@/db/schema';

/**
 * POST /api/auth/signout — clears the cookie and revokes every session of the
 * user (sessions are stateless JWTs, so the watermark is the only way to make a
 * copied token stop working). GET is intentionally not supported: a logout that
 * any third-party page could trigger with an <img> tag is a CSRF nuisance.
 */
export const POST: APIRoute = async ({ locals }) => {
  const db = getDb();
  if (locals.user && db) {
    try {
      await revokeUserSessions(db, users, locals.user.id);
    } catch (err) {
      console.error('[auth/signout] revoke failed:', err instanceof Error ? err.message : err);
    }
  }
  return new Response(null, { status: 303, headers: { Location: '/', 'Set-Cookie': clearSessionCookie() } });
};
