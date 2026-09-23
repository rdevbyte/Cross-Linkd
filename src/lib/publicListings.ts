/**
 * Public listing source: bundled sample data + APPROVED database listings.
 * Unapproved submissions (draft/pending/rejected/…) are never served publicly.
 * When no database is configured (previews), only sample data is returned.
 */
import { and, eq, isNull, desc } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { listings, listingLocations } from '@/db/schema';
import { SAMPLE_LISTINGS, type SampleListing } from '@/data/listings';
import { mapListingRow } from '@/lib/submissions';
import { includeSamples } from '@/lib/sampleGate';

/** Approved, non-deleted DB listings. Empty when no DB is configured. */
async function getDbPublished(): Promise<SampleListing[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = await db
      .select()
      .from(listings)
      .where(and(eq(listings.status, 'published'), isNull(listings.deletedAt)))
      .orderBy(desc(listings.publishedAt))
      .limit(500);
    if (!rows.length) return [];
    const locs = await db.select().from(listingLocations).where(eq(listingLocations.isPrimary, true));
    const byListing = new Map(locs.map((l) => [l.listingId, l]));
    return rows.map((r) => mapListingRow(r, byListing.get(r.id)));
  } catch (err) {
    console.error('[publicListings] query failed, serving DB results only:', err);
    return [];
  }
}

/**
 * Everything the public may see right now: approved DB listings, plus the
 * bundled demo corpus ONLY when SHOW_SAMPLE_CONTENT is enabled (off by
 * default, so a fresh deployment starts with a genuinely clean slate).
 */
export async function getPublicListings(): Promise<SampleListing[]> {
  const dbItems = await getDbPublished();
  return includeSamples() ? [...dbItems, ...SAMPLE_LISTINGS] : dbItems;
}

/** DB-published listings only (merged into the search engine's corpus). */
export async function getDbListings(): Promise<SampleListing[]> {
  return getDbPublished();
}

export async function findPublicListing(slug: string): Promise<SampleListing | undefined> {
  const all = await getPublicListings();
  return all.find((l) => l.slug === slug);
}
