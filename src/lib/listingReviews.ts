/**
 * Public review loading for the listing page.
 *
 * `mapListingRow` does not carry reviews, so database listings used to render an empty
 * "Reviews" section even after a moderator published reviews (the header still said
 * "(3 reviews)"). This loads the approved ones.
 */
import { and, desc, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { reviews, users } from '@/db/schema';
import type { SampleReview } from '@/data/listings';

/** "Olivia Owner" → "Olivia O." — reviewers chose a display name, not to publish their full name. */
export function publicReviewerName(displayName: string | null | undefined): string {
  const parts = String(displayName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Community member';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

/** Published, non-deleted reviews of one database listing, newest first. */
export async function getPublishedReviews(listingId: string, limit = 20): Promise<SampleReview[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = await db
      .select({
        rating: reviews.rating,
        title: reviews.title,
        body: reviews.body,
        createdAt: reviews.createdAt,
        ownerResponse: reviews.ownerResponse,
        authorName: users.displayName,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.authorId, users.id))
      .where(and(eq(reviews.listingId, listingId), eq(reviews.status, 'published'), isNull(reviews.deletedAt)))
      .orderBy(desc(reviews.createdAt))
      .limit(limit);
    return rows.map((r) => ({
      name: publicReviewerName(r.authorName),
      rating: r.rating,
      title: r.title ?? '',
      body: r.body ?? '',
      daysAgo: Math.max(0, Math.floor((Date.now() - r.createdAt.getTime()) / 86_400_000)),
      verified: false, // CrossLinkd does not verify reviewers (see /reviews-policy)
      ownerResponse: r.ownerResponse ?? undefined,
    }));
  } catch (err) {
    console.error('[listingReviews] query failed:', err instanceof Error ? err.message : err);
    return [];
  }
}
