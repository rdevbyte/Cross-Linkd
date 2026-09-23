import type { APIRoute } from 'astro';
import { eq, sql } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { users, auditLogs } from '@/db/schema';
import { apiGuard, jsonError, jsonOk } from '@/lib/guards';

/**
 * POST /api/admin/setup — one-time first-admin bootstrap.
 * Requirements (ALL must hold):
 *   1. An `ADMIN_SETUP_KEY` environment variable is set on the server.
 *   2. The caller provides that key (compared timing-safe).
 *   3. The caller is signed in (the signed-in account becomes the admin).
 *   4. NO super_admin exists yet — after the first promotion the endpoint is
 *      permanently disabled. No credentials are ever accepted here; the caller
 *      must already have an account.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const deny = apiGuard.user(locals);
  if (deny) return deny;
  if (!hasDatabase()) return jsonError(503, 'Setup is unavailable in this preview.');

  const expected = process.env.ADMIN_SETUP_KEY ?? '';
  if (!expected) return jsonError(404, 'Setup is not enabled on this deployment.');
  let provided = '';
  try {
    provided = String((await request.json() as { key?: unknown }).key ?? '');
  } catch { return jsonError(400, 'Invalid request body.'); }
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return jsonError(403, 'Invalid setup key.');

  const db = getDb()!;
  const existingAdmins = await db.select({ id: users.id }).from(users).where(sql`${users.role} = 'super_admin' and ${users.deletedAt} is null`).limit(1);
  if (existingAdmins.length) return jsonError(409, 'An administrator already exists — setup is closed.');

  await db.update(users).set({ role: 'super_admin', updatedAt: new Date() }).where(eq(users.id, locals.user!.id));
  await db.insert(auditLogs).values({
    actorId: locals.user!.id,
    action: 'user.role_change',
    targetType: 'user',
    targetId: locals.user!.id,
    metadata: { from: 'member', to: 'super_admin', via: 'setup-key' },
  });
  return jsonOk({ user: { id: locals.user!.id, role: 'super_admin' }, notice: 'Sign out and sign back in to activate administrator access.' });
};

function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
