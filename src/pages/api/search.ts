import type { APIRoute } from 'astro';
import { desc, sql } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { listings } from '@/db/schema';
import { searchListings } from '@/lib/search';
import { parseQuery } from '@/lib/hashtags';

/**
 * GET /api/search?q=...&type=...&city=...&sort=...
 * Production: Postgres full-text (tsvector) + trigram. Demo: in-memory engine.
 */
/** Numeric query params: unparsable/NaN values fall back to defaults instead of poisoning the query. */
function num(raw: string | null, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (raw === null || raw === '' || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export const GET: APIRoute = async ({ url }) => {
  const sp = url.searchParams;
  const filters = {
    q: (sp.get('q') ?? '').slice(0, 300),
    near: sp.get('near') ?? undefined,
    type: sp.getAll('type'),
    denomination: sp.getAll('denomination'),
    industry: sp.getAll('industry'),
    profession: sp.getAll('profession'),
    city: sp.get('city') ?? undefined,
    verifiedOnly: sp.get('verifiedOnly') === '1',
    minRating: num(sp.get('minRating'), 0, 0, 5),
    sort: (sp.get('sort') as 'relevance') ?? 'relevance',
    page: Math.floor(num(sp.get('page'), 1, 1, 10_000)),
    perPage: Math.floor(num(sp.get('perPage'), 12, 1, 50)),
  };

  // ---- Production Postgres path ----
  if (hasDatabase()) {
    try {
      const db = getDb()!;
      const { text } = parseQuery(filters.q);
      const term = text.trim();
      const limit = filters.perPage;
      const offset = (filters.page - 1) * filters.perPage;
      // websearch_to_tsquery tolerates arbitrary user input (quotes, &, |, !, parentheses)
      // where a hand-built to_tsquery string threw and silently fell back to the demo engine.
      const where = term
        ? sql`${listings.status} = 'published' AND (${listings.deletedAt} IS NULL) AND search_vector @@ websearch_to_tsquery('english', ${term})`
        : sql`${listings.status} = 'published' AND (${listings.deletedAt} IS NULL)`;
      const [rows, [{ total }]] = await Promise.all([
        db
          .select({
            id: listings.id, slug: listings.slug, name: listings.name,
            typeSlug: listings.typeSlug, tagline: listings.tagline,
            avgRating: listings.avgRating, reviewCount: listings.reviewCount,
          })
          .from(listings)
          .where(where)
          .orderBy(desc(listings.publishedAt))
          .limit(limit)
          .offset(offset),
        db.select({ total: sql<number>`count(*)::int` }).from(listings).where(where),
      ]);
      return json({ mode: 'postgres', hits: rows, total: Number(total), page: filters.page, perPage: filters.perPage });
    } catch (err) {
      console.error('[api/search] postgres failed, falling back:', err instanceof Error ? err.message : err);
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
