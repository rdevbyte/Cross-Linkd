import type { APIRoute } from 'astro';
import { sql } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { listings } from '@/db/schema';
import { searchListings } from '@/lib/search';
import { parseQuery } from '@/lib/hashtags';

/**
 * GET /api/search?q=...&type=...&city=...&sort=...
 * Production: Postgres full-text (tsvector) + trigram. Demo: in-memory engine.
 */
export const GET: APIRoute = async ({ url }) => {
  const sp = url.searchParams;
  const filters = {
    q: sp.get('q') ?? '',
    near: sp.get('near') ?? undefined,
    type: sp.getAll('type'),
    denomination: sp.getAll('denomination'),
    industry: sp.getAll('industry'),
    profession: sp.getAll('profession'),
    city: sp.get('city') ?? undefined,
    verifiedOnly: sp.get('verifiedOnly') === '1',
    minRating: sp.get('minRating') ? Number(sp.get('minRating')) : 0,
    sort: (sp.get('sort') as 'relevance') ?? 'relevance',
    page: sp.get('page') ? Number(sp.get('page')) : 1,
    perPage: Math.min(50, sp.get('perPage') ? Number(sp.get('perPage')) : 12),
  };

  // ---- Production Postgres path ----
  if (hasDatabase()) {
    try {
      const db = getDb()!;
      const { text } = parseQuery(filters.q);
      const tsquery = text.trim().split(/\s+/).filter(Boolean).map((w) => `${w}:*`).join(' & ') || 'christian';
      const limit = filters.perPage;
      const offset = (filters.page - 1) * filters.perPage;
      const rows = await db
        .select({
          id: listings.id, slug: listings.slug, name: listings.name,
          typeSlug: listings.typeSlug, tagline: listings.tagline,
          avgRating: listings.avgRating, reviewCount: listings.reviewCount,
        })
        .from(listings)
        .where(
          sql`${listings.status} = 'published'
            AND (${listings.deletedAt} IS NULL)
            AND search_vector @@ to_tsquery('english', ${tsquery})`,
        )
        .limit(limit)
        .offset(offset);
      return json({ mode: 'postgres', hits: rows, total: rows.length, page: filters.page, perPage: filters.perPage });
    } catch (err) {
      console.error('[api/search] postgres failed, falling back:', err);
    }
  }

  // ---- Demo / fallback path ----
  const result = searchListings(filters);
  return json({ mode: 'memory', ...result });
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' },
  });
}
