import type { APIRoute } from 'astro';
import { and, asc, desc, eq, ilike, isNull, sql } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { listingServices, listings } from '@/db/schema';
import { suggestHashtags } from '@/lib/hashtags';
import { sharedRateLimit } from '@/lib/sharedRateLimit';
import { clientIp } from '@/lib/clientIp';

/** GET /api/suggest?q=... — bounded SQL autocomplete + hashtag suggestions. */
export const GET: APIRoute = async ({ url, request }) => {
  if (!(await sharedRateLimit(`suggest:ip:${clientIp(request)}`, 120, 60 * 1000))) {
    return json({ suggestions: [], tags: [], error: 'Too many suggestions requests.' }, 429);
  }
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
  if (!q) return json({ suggestions: [], tags: [] });

  const hashIdx = q.lastIndexOf('#');
  const tags = hashIdx >= 0
    ? suggestHashtags(q.slice(hashIdx + 1)).map((tag) => ({ label: `#${tag.tag}`, kind: tag.kind, value: tag.tag }))
    : suggestHashtags(q).slice(0, 3).map((tag) => ({ label: `#${tag.tag}`, kind: tag.kind, value: tag.tag }));

  const fragment = q.replace(/#[\w-]*$/, '').trim() || q;
  const escaped = fragment.replace(/[\\%_]/g, '\\$&');
  const pattern = `%${escaped}%`;
  const db = getDb();
  if (!db && hasDatabase()) {
    console.error('[api/suggest] database client unavailable');
    return json({ suggestions: [], tags, error: 'Suggestions are temporarily unavailable.' }, 503);
  }
  let suggestions: { label: string; kind: string; value: string }[] = [];

  if (db && fragment.length >= 2) {
    try {
      const [nameRows, serviceRows] = await Promise.all([
        db.select({ label: listings.name, kind: listings.typeSlug, value: listings.name })
          .from(listings)
          .where(and(eq(listings.status, 'published'), isNull(listings.deletedAt), ilike(listings.name, pattern)))
          .orderBy(desc(listings.featuredRank), desc(listings.publishedAt), asc(listings.name))
          .limit(6),
        db.select({ label: listingServices.name })
          .from(listingServices)
          .innerJoin(listings, eq(listings.id, listingServices.listingId))
          .where(and(eq(listings.status, 'published'), isNull(listings.deletedAt), ilike(listingServices.name, pattern)))
          .groupBy(listingServices.name)
          .orderBy(desc(sql`count(*)`), asc(listingServices.name))
          .limit(6),
      ]);
      suggestions = [
        ...nameRows.map((row) => ({ label: row.label, kind: row.kind, value: row.value })),
        ...serviceRows.map((row) => ({ label: row.label, kind: 'service', value: row.label })),
      ].filter((item, index, items) => items.findIndex((candidate) => candidate.label.toLowerCase() === item.label.toLowerCase()) === index).slice(0, 6);
    } catch (error) {
      console.error('[api/suggest] database autocomplete failed', { message: error instanceof Error ? error.message : String(error) });
      return json({ suggestions: [], tags, error: 'Suggestions are temporarily unavailable.' }, 503);
    }
  }

  return json({ suggestions, tags });
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': status === 429 || status >= 500 ? 'no-store' : 'public, max-age=0, s-maxage=60, stale-while-revalidate=120',
    },
  });
}
