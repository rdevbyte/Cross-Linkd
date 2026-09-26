import type { APIRoute } from 'astro';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { reviews, auditLogs } from '@/db/schema';
import { apiGuard, jsonError, jsonOk } from '@/lib/guards';

/**
 * POST /api/admin/reviews/[id] — staff moderation of a user review.
 * Body: { "action": "publish" | "remove", "note"?: string }
 *
 * publish → status 'published' (appears on the public listing page)
 * remove  → status 'removed' + soft delete (hidden from every query)
 *
 * Both actions recompute the listing's denormalized `review_count` /
 * `avg_rating` inside the same transaction so the public page and the
 * aggregate recompute cron can never disagree about the visible numbers.
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  const deny = apiGuard.admin(locals);
  if (deny) return deny;
  if (!hasDatabase()) return jsonError(503, 'Review moderation is unavailable in this preview.');

  const id = params.id ?? '';
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, 'Invalid JSON body.'); }
  const action = (body as { action?: string })?.action;
  if (action !== 'publish' && action !== 'remove') {
    return jsonError(400, 'action must be "publish" or "remove".');
  }
  const note = (body as { note?: string })?.note?.trim() || undefined;

  const db = getDb()!;
  try {
    await db.transaction(async (tx) => {
      const rows = await tx.select().from(reviews).where(eq(reviews.id, id)).limit(1);
      const review = rows[0];
      if (!review || review.deletedAt) return jsonError(404, 'Review not found.');
      if (review.status !== 'pending' && review.status !== 'flagged') {
        return jsonError(409, `Review is already ${review.status}.`);
      }

      if (action === 'publish') {
        await tx.update(reviews).set({ status: 'published', updatedAt: new Date() }).where(eq(reviews.id, id));
      } else {
        await tx.update(reviews).set({ status: 'removed', deletedAt: new Date(), updatedAt: new Date() }).where(eq(reviews.id, id));
      }

      // Recompute the listing's visible aggregates from the remaining
      // published, non-deleted reviews (JS-side so the zero-review case
      // zeroes the columns instead of leaving stale values behind).
      const [agg] = await tx
        .select({
          cnt: sql<number>`count(*)`,
          avg: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
        })
        .from(reviews)
        .where(and(
          eq(reviews.listingId, review.listingId),
          eq(reviews.status, 'published'),
          isNull(reviews.deletedAt),
        ));
      await tx.execute(sql`
        UPDATE listings
        SET review_count = ${agg ? Number(agg.cnt) : 0},
            avg_rating = ${agg ? Number(agg.avg) : 0},
            updated_at = now()
        WHERE id = ${review.listingId}
      `);

      await tx.insert(auditLogs).values({
        actorId: locals.user!.id,
        action: `review.${action}`,
        targetType: 'review',
        targetId: id,
        metadata: note ? { note } : {},
      });
    });
  } catch (err) {
    console.error('[api/admin/reviews] moderation failed:', err);
    return jsonError(500, 'Could not moderate the review. Please try again.');
  }

  return jsonOk({ review: { id, status: action === 'publish' ? 'published' : 'removed' } });
};
