import { and, eq, isNull, desc } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { reviews, listings, users } from '@/db/schema';
import { includeSamples } from '@/lib/sampleGate';
import { TESTIMONIALS } from '@/data/testimonials';

export interface PublicReview {
  id: string;
  quote: string;
  name: string;
  role: string;
  rating: number;
  listingName?: string;
  listingSlug?: string;
  hue: number;
}

/**
 * Dynamically query approved reviews from the database.
 * If SHOW_SAMPLE_CONTENT is true, fall back to sample testimonials for demos.
 * In production clean-slate mode, returns only real published user reviews.
 * Returns an empty array if there are no reviews yet.
 */
export async function getPublicTestimonials(): Promise<PublicReview[]> {
  const db = getDb();
  let dbReviews: PublicReview[] = [];

  if (db) {
    try {
      const rows = await db
        .select({
          id: reviews.id,
          body: reviews.body,
          rating: reviews.rating,
          userName: users.displayName,
          listingName: listings.name,
          listingSlug: listings.slug,
        })
        .from(reviews)
        .innerJoin(listings, eq(reviews.listingId, listings.id))
        .leftJoin(users, eq(reviews.authorId, users.id))
        .where(
          and(
            eq(reviews.status, 'published'),
            isNull(reviews.deletedAt),
            eq(listings.status, 'published'),
            isNull(listings.deletedAt),
          ),
        )
        .orderBy(desc(reviews.createdAt))
        .limit(6);

      dbReviews = rows
        .filter((r) => r.body && r.body.trim().length > 0)
        .map((r, i) => ({
          id: r.id,
          quote: r.body!,
          name: r.userName || 'Community Member',
          role: 'Customer review',
          rating: r.rating,
          listingName: r.listingName,
          listingSlug: r.listingSlug,
          hue: (i * 60 + 190) % 360,
        }));
    } catch (err) {
      console.error('[publicReviews] fetch failed:', err);
    }
  }

  const sampleReviews: PublicReview[] = includeSamples()
    ? TESTIMONIALS.map((t, i) => ({
        id: `sample-${i}`,
        quote: t.quote,
        name: t.name,
        role: t.role,
        rating: 5,
        listingName: t.role.includes('Owner') ? t.role.replace('Owner, ', '') : undefined,
        listingSlug: t.listingSlug,
        hue: t.hue,
      }))
    : [];

  return [...dbReviews, ...sampleReviews];
}
