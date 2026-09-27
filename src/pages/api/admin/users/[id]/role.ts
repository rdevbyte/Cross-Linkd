import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { users, auditLogs } from '@/db/schema';
import { roleUpdateSchema } from '@/lib/validation';
import { apiGuard, jsonError, jsonOk } from '@/lib/guards';

/**
 * POST /api/admin/users/[id]/role — super-admin-only role management.
 * The role rides the session JWT, so existing sessions are revoked
 * (`sessions_valid_after`) and the change applies at the user's next sign-in.
 * Self-role changes are refused to prevent accidental lockout.
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  const deny = apiGuard.root(locals);
  if (deny) return deny;
  if (!hasDatabase()) return jsonError(503, 'User management is unavailable in this preview.');
  const id = params.id ?? '';
  if (id === locals.user!.id) return jsonError(409, 'You cannot change your own role.');
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, 'Invalid JSON body.'); }
  const parsed = roleUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'Unknown role.');

  const db = getDb()!;
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  const target = rows[0];
  if (!target || target.deletedAt) return jsonError(404, 'User not found.');

  await db.update(users)
    .set({ role: parsed.data.role, sessionsValidAfter: new Date(), updatedAt: new Date() })
    .where(eq(users.id, id));
  await db.insert(auditLogs).values({
    actorId: locals.user!.id,
    action: 'user.role_change',
    targetType: 'user',
    targetId: id,
    metadata: { from: target.role, to: parsed.data.role },
  });
  return jsonOk({ user: { id, role: parsed.data.role } });
};
