import type { APIRoute } from 'astro';
import { isAdmin } from '@/lib/auth';
import { SAMPLE_LISTINGS } from '@/data/listings';
import { includeSamples } from '@/lib/sampleGate';
import { INDUSTRIES } from '@/data/industries';
import { DENOMINATIONS } from '@/data/denominations';
import { getDb, hasDatabase } from '@/db/client';
import { listings, listingLocations } from '@/db/schema';
import { isNull, desc, and, eq } from 'drizzle-orm';

/** GET /api/admin/export?table=listings|taxonomy — admin CSV/JSON export. */
export const GET: APIRoute = async ({ url, locals }) => {
  if (!isAdmin(locals.user) && process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    return new Response('Forbidden', { status: 403 });
  }
  const table = url.searchParams.get('table') ?? 'listings';
  if (table === 'taxonomy') {
    return new Response(JSON.stringify({ industries: INDUSTRIES, denominations: DENOMINATIONS }, null, 2), {
      headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="taxonomy.json"' },
    });
  }

  const exportRows: Array<[string, string, string, string, string, string, string, string, string, string, number | string, number | string]> = [];

  if (hasDatabase()) {
    const db = getDb()!;
    const dbListings = await db
      .select({ listing: listings, loc: listingLocations })
      .from(listings)
      .leftJoin(listingLocations, and(eq(listingLocations.listingId, listings.id), eq(listingLocations.isPrimary, true)))
      .where(isNull(listings.deletedAt))
      .orderBy(desc(listings.updatedAt));

    for (const { listing: l, loc } of dbListings) {
      const denoms = Array.isArray(l.denominationsList) ? l.denominationsList.join(';') : '';
      exportRows.push([
        l.id,
        l.slug,
        l.name,
        l.typeSlug,
        l.industrySlug ?? '',
        l.categorySlug ?? '',
        l.customCategory ?? '',
        denoms,
        loc?.city ?? '',
        loc?.region ?? '',
        Number(l.avgRating ?? 0),
        l.reviewCount,
      ]);
    }
  }

  if (includeSamples()) {
    for (const l of SAMPLE_LISTINGS) {
      exportRows.push([
        l.id,
        l.slug,
        l.name,
        l.typeSlug,
        l.industrySlug ?? (l.industries[0] ?? ''),
        l.categorySlug ?? (l.professions[0] ?? ''),
        l.customCategory ?? '',
        (l.denominations ?? []).join(';'),
        l.city,
        l.region,
        l.rating,
        l.reviewCount,
      ]);
    }
  }

  const header = 'id,slug,name,type,industry,category,custom_category,denominations,city,region,rating,reviews';
  const csvLines = [
    header,
    ...exportRows.map((row) =>
      row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
    ),
  ];

  return new Response(csvLines.join('\n'), {
    headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="listings.csv"' },
  });
};
