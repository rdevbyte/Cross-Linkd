import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { sessions, users } from '@/db/schema';

/** POST /api/account/delete — mark the signed-in account deleted and remove its database sessions. */
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
    await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, user.id));
    await db.delete(sessions).where(eq(sessions.userId, user.id));
  } catch (err) {
    console.error('[api/account/delete] failed', err instanceof Error ? err.name : 'error');
    return fail('We could not mark the account deleted. Please try again.');
  }

  return redirect('/account?deleted=1', 303);
};
