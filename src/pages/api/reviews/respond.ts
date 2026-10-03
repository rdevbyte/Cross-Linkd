import type { APIRoute } from 'astro';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { listings, reviews } from '@/db/schema';

/** POST /api/reviews/respond — queue one owner response for staff moderation. */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!locals.user) return redirect('/auth/signin?next=%2Fdashboard%2Freviews', 303);
  if (!hasDatabase()) return redirect('/dashboard/reviews?error=unavailable', 303);

  const form = await request.formData();
  const reviewId = String(form.get('reviewId') ?? '').trim();
  const response = String(form.get('response') ?? '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reviewId)) {
    return redirect('/dashboard/reviews?error=invalid', 303);
  }
  if (response.length < 2 || response.length > 2000) {
    return redirect('/dashboard/reviews?error=response-length', 303);
  }

  const db = getDb();
  if (!db) return redirect('/dashboard/reviews?error=unavailable', 303);
  try {
    const saved = await db.transaction(async (tx) => {
      const [review] = await tx
        .select({ id: reviews.id, status: reviews.status, deletedAt: reviews.deletedAt, ownerResponse: reviews.ownerResponse, ownerRespondedAt: reviews.ownerRespondedAt })
        .from(reviews)
        .innerJoin(listings, eq(reviews.listingId, listings.id))
        .where(and(
          eq(reviews.id, reviewId),
          eq(listings.ownerId, locals.user!.id),
          isNull(listings.deletedAt),
        ))
        .limit(1);
      if (!review || review.deletedAt || review.status !== 'published') return 'not-available';
      if (review.ownerResponse || review.ownerRespondedAt) return 'already-responded';

      const rows = await tx.update(reviews).set({
        ownerResponse: response,
        // Null ownerRespondedAt marks this response as awaiting staff moderation.
        ownerRespondedAt: null,
        updatedAt: new Date(),
      }).where(and(
        eq(reviews.id, reviewId),
        eq(reviews.status, 'published'),
        isNull(reviews.deletedAt),
        isNull(reviews.ownerResponse),
        isNull(reviews.ownerRespondedAt),
        sql`EXISTS (
          SELECT 1 FROM ${listings}
          WHERE ${listings.id} = ${reviews.listingId}
            AND ${listings.ownerId} = ${locals.user!.id}
            AND ${listings.deletedAt} IS NULL
        )`,
      )).returning({ id: reviews.id });
      return rows.length ? 'saved' : 'already-responded';
    });

    if (saved === 'saved') return redirect('/dashboard/reviews?submitted=1', 303);
    return redirect(`/dashboard/reviews?error=${saved}`, 303);
  } catch (err) {
    console.error('[api/reviews/respond] failed:', err instanceof Error ? err.name : 'error');
    return redirect('/dashboard/reviews?error=unavailable', 303);
  }
};
