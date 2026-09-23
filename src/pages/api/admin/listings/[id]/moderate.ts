import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { listings, moderationActions, auditLogs } from '@/db/schema';
import { moderationActionSchema } from '@/lib/validation';
import { apiGuard, jsonError, jsonOk } from '@/lib/guards';

/**
 * POST /api/admin/listings/[id]/moderate — admin-only status transitions.
 * approve → published · reject → rejected · request_changes → changes_requested · delete → archived
 * Every action writes moderation_actions + audit_logs rows.
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  const deny = apiGuard.admin(locals);
  if (deny) return deny;
  if (!hasDatabase()) return jsonError(503, 'Moderation is unavailable in this preview.');
  const id = params.id ?? '';
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, 'Invalid JSON body.'); }
  const parsed = moderationActionSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.errors[0]?.message ?? 'Invalid moderation action.');
  const { action, note } = parsed.data;
  if ((action === 'reject' || action === 'request_changes') && !note?.trim()) {
    return jsonError(400, 'A note is required when rejecting or requesting changes.');
  }

  const db = getDb()!;
  const rows = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  const listing = rows[0];
  if (!listing || listing.deletedAt) return jsonError(404, 'Listing not found.');

  const patch: Partial<typeof listings.$inferInsert> = {
    reviewNote: note?.trim() ?? null,
    reviewedAt: new Date(),
    reviewedBy: locals.user!.id,
    updatedAt: new Date(),
  };
  if (action === 'approve') patch.status = 'published';
  else if (action === 'reject') patch.status = 'rejected';
  else if (action === 'request_changes') patch.status = 'changes_requested';
  else if (action === 'delete') { patch.status = 'archived'; patch.deletedAt = new Date(); }
  if (action === 'approve') patch.publishedAt = new Date();

  await db.update(listings).set(patch).where(eq(listings.id, id));
  await db.insert(moderationActions).values({
    moderatorId: locals.user!.id,
    targetType: 'listing',
    targetId: id,
    action,
    reason: note?.trim() ?? null,
  });
  await db.insert(auditLogs).values({
    actorId: locals.user!.id,
    action: `listing.${action}`,
    targetType: 'listing',
    targetId: id,
    metadata: note?.trim() ? { note: note.trim() } : {},
  });

  return jsonOk({ listing: { id, status: patch.status } });
};
