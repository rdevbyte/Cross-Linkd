/**
 * Public listing source: published database listings only.
 * Draft, deleted, and non-database sample listings are never served publicly.
 * When no database is configured, the public catalog is empty.
 */
import { and, eq, isNull, desc, inArray } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { listings, listingLocations, listingDenominations, denominations, listingHashtags, hashtags, listingProfessions, professions, listingServices, listingIndustries, industries, reviews } from '@/db/schema';
import type { SampleListing, SampleReview } from '@/data/listings';
import { mapListingRow } from '@/lib/submissions';

/** Published, non-deleted DB listings (optionally narrowed by unique slug). Empty when no DB is configured. */
async function getDbPublished(slug?: string, onlyIds?: string[], throwOnError = false): Promise<SampleListing[]> {
  const db = getDb();
  if (!db || (onlyIds && onlyIds.length === 0)) return [];
  try {
    const rows = await db
      .select()
      .from(listings)
      .where(and(
        eq(listings.status, 'published'),
        isNull(listings.deletedAt),
        ...(slug ? [eq(listings.slug, slug)] : []),
        ...(onlyIds ? [inArray(listings.id, onlyIds)] : []),
      ))
      .orderBy(desc(listings.publishedAt));
    if (!rows.length) return [];

    const ids = rows.map((r) => r.id);
    const [locs, denomRows, tagRows, professionRows, serviceRows, industryRows] = await Promise.all([
      db.select().from(listingLocations).where(and(inArray(listingLocations.listingId, ids), eq(listingLocations.isPrimary, true))),
      db.select({ listingId: listingDenominations.listingId, slug: denominations.slug })
        .from(listingDenominations)
        .innerJoin(denominations, eq(listingDenominations.denominationId, denominations.id))
        .where(inArray(listingDenominations.listingId, ids)),
      db.select({ listingId: listingHashtags.listingId, tag: hashtags.tag })
        .from(listingHashtags)
        .innerJoin(hashtags, eq(listingHashtags.hashtagId, hashtags.id))
        .where(inArray(listingHashtags.listingId, ids)),
      db.select({ listingId: listingProfessions.listingId, slug: professions.slug })
        .from(listingProfessions)
        .innerJoin(professions, eq(listingProfessions.professionId, professions.id))
        .where(inArray(listingProfessions.listingId, ids)),
      db.select({ listingId: listingServices.listingId, name: listingServices.name })
        .from(listingServices).where(inArray(listingServices.listingId, ids)),
      db.select({ listingId: listingIndustries.listingId, slug: industries.slug })
        .from(listingIndustries)
        .innerJoin(industries, eq(listingIndustries.industryId, industries.id))
        .where(inArray(listingIndustries.listingId, ids)),
    ]);

    const byListingLoc = new Map(locs.map((l) => [l.listingId, l]));
    const byListingDenoms = new Map<string, string[]>();
    for (const d of denomRows) {
      const list = byListingDenoms.get(d.listingId) ?? [];
      list.push(d.slug);
      byListingDenoms.set(d.listingId, list);
    }
    const byListingProfessions = new Map<string, string[]>();
    for (const row of professionRows) { const list = byListingProfessions.get(row.listingId) ?? []; list.push(row.slug); byListingProfessions.set(row.listingId, list); }
    const byListingServices = new Map<string, string[]>();
    for (const row of serviceRows) { const list = byListingServices.get(row.listingId) ?? []; list.push(row.name); byListingServices.set(row.listingId, list); }
    const byListingTags = new Map<string, string[]>();
    for (const t of tagRows) {
      const list = byListingTags.get(t.listingId) ?? [];
      list.push(t.tag);
      byListingTags.set(t.listingId, list);
    }
    const byListingIndustries = new Map<string, string[]>();
    for (const row of industryRows) { const list = byListingIndustries.get(row.listingId) ?? []; list.push(row.slug); byListingIndustries.set(row.listingId, list); }

    const mapped = rows.map((r) => mapListingRow(r, byListingLoc.get(r.id), byListingDenoms.get(r.id) ?? [], byListingTags.get(r.id) ?? [], {
      professions: byListingProfessions.get(r.id) ?? [],
      services: byListingServices.get(r.id) ?? [],
      industries: byListingIndustries.get(r.id) ?? [],
    }));

    // Reviews are only needed on a single listing detail page; avoid hydrating them
    // for full-catalog browse/search calls. Owner responses remain hidden until approved.
    if (slug && mapped[0]) {
      const publishedReviews = await db.select({
        rating: reviews.rating,
        title: reviews.title,
        body: reviews.body,
        createdAt: reviews.createdAt,
        verifiedInteraction: reviews.verifiedInteraction,
        ownerResponse: reviews.ownerResponse,
        ownerRespondedAt: reviews.ownerRespondedAt,
      }).from(reviews).where(and(
        eq(reviews.listingId, rows[0].id),
        eq(reviews.status, 'published'),
        isNull(reviews.deletedAt),
      )).orderBy(desc(reviews.createdAt)).limit(50);
      mapped[0].reviews = publishedReviews.map((review): SampleReview => ({
        name: 'Community reviewer',
        rating: review.rating,
        title: review.title ?? 'Community review',
        body: review.body ?? '',
        daysAgo: Math.max(0, Math.floor((Date.now() - new Date(review.createdAt).getTime()) / 86_400_000)),
        verified: review.verifiedInteraction,
        ownerResponse: review.ownerRespondedAt ? (review.ownerResponse ?? undefined) : undefined,
      }));
    }
    return mapped;
  } catch (err) {
    console.error('[publicListings] query failed:', err instanceof Error ? err.message : err);
    if (throwOnError) throw err;
    return [];
  }
}

/** Every published, non-deleted database listing currently visible to the public. */
export async function getPublicListings(): Promise<SampleListing[]> {
  return getDbPublished();
}

/** DB-published listings only (legacy bulk callers; avoid for public search paths). */
export async function getDbListings(): Promise<SampleListing[]> {
  return getDbPublished();
}

/** Hydrate only the page of IDs selected and paginated by a database query. */
export async function getDbListingsByIds(ids: string[]): Promise<SampleListing[]> {
  return getDbPublished(undefined, ids, true);
}

/**
 * Detail-page lookup narrows the published set by its unique slug so a listing
 * stays reachable without loading the full public catalog.
 */
export async function findPublicListing(slug: string): Promise<SampleListing | undefined> {
  const [hit] = await getDbPublished(slug);
  return hit;
}
