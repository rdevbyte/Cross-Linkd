import type { APIRoute } from 'astro';
import { apiGuard } from '@/lib/guards';
import { INDUSTRIES } from '@/data/industries';
import { DENOMINATIONS } from '@/data/denominations';
import { getDb, hasDatabase } from '@/db/client';
import { listings, listingLocations } from '@/db/schema';
import { isNull, desc, and, eq } from 'drizzle-orm';

/** GET /api/admin/export?table=listings|taxonomy — admin CSV/JSON export. */
export const GET: APIRoute = async ({ url, locals }) => {
  const deny = apiGuard.admin(locals);
  if (deny) return deny;
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


  const header = 'id,slug,name,type,industry,category,custom_category,denominations,city,region,rating,reviews';
  const csvCell = (value: string | number) => {
    const text = String(value);
    // Quoting is not sufficient: spreadsheet programs may evaluate formulas in quoted cells.
    const safe = /^[\t\r\n \u0000\uFEFF]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const csvLines = [
    header,
    ...exportRows.map((row) => row.map(csvCell).join(',')),
  ];

  return new Response(csvLines.join('\n'), {
    headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="listings.csv"' },
  });
};
