import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { users } from '@/db/schema';
import { clearSessionCookie } from '@/lib/auth';

/**
 * POST /api/account/delete — mark the signed-in account deleted and end its sessions.
 * Sessions are stateless JWTs, so revocation is the `sessions_valid_after`
 * watermark (checked by the middleware) plus clearing this browser's cookie.
 */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const fail = (message: string) => redirect(`/account?error=${encodeURIComponent(message)}`, 303);
  const user = locals.user;
  if (!user) return fail('Sign in before requesting account deletion.');

  const form = await request.formData();
  if (form.get('confirm') !== 'delete') return fail('Confirm that you want this account marked deleted.');
  if (!hasDatabase()) return fail('The directory database is not connected, so the account could not be marked deleted.');

  try {
    const db = getDb();
    if (!db) return fail('The directory database is not connected, so the account could not be marked deleted.');
    await db.update(users)
      .set({ deletedAt: new Date(), sessionsValidAfter: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));
  } catch (err) {
    console.error('[api/account/delete] failed', err instanceof Error ? err.name : 'error');
    return fail('We could not mark the account deleted. Please try again.');
  }

  return new Response(null, { status: 303, headers: { Location: '/account?deleted=1', 'Set-Cookie': clearSessionCookie() } });
};
