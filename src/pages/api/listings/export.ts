import type { APIRoute } from 'astro';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { listings, listingLocations } from '@/db/schema';
import { apiGuard } from '@/lib/guards';

/** GET /api/listings/export — CSV export of the signed-in owner's listings. */
export const GET: APIRoute = async ({ locals }) => {
  const denied = apiGuard.user(locals);
  if (denied) return denied;

  const header = 'name,type,city,region,rating,reviews,recommendations,views';
  if (!hasDatabase()) return csvResponse(header);

  const db = getDb();
  if (!db) return jsonError('Database is temporarily unavailable.', 503);

  try {
    const rows = await db
      .select({ listing: listings, location: listingLocations })
      .from(listings)
      .leftJoin(listingLocations, and(
        eq(listingLocations.listingId, listings.id),
        eq(listingLocations.isPrimary, true),
      ))
      .where(and(eq(listings.ownerId, locals.user!.id), isNull(listings.deletedAt)))
      .orderBy(desc(listings.updatedAt));

    const lines = rows.map(({ listing, location }) => [
      listing.name,
      listing.typeSlug,
      location?.city ?? '',
      location?.region ?? '',
      Number(listing.avgRating ?? 0),
      listing.reviewCount,
      listing.recommendationCount,
      listing.viewCount,
    ].map(csvCell).join(','));

    return csvResponse([header, ...lines].join('\n'));
  } catch (error) {
    console.error('[api/listings/export] failed', { message: error instanceof Error ? error.message : String(error) });
    return jsonError('Unable to export listings right now.', 503);
  }
};

function csvCell(value: string | number): string {
  const text = String(value);
  const safe = /^[\t\r\n \u0000\uFEFF]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function csvResponse(body: string): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="my-listings.csv"',
    },
  });
}

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
