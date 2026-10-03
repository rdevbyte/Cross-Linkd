import type { APIRoute } from 'astro';
import { hasDatabase } from '@/db/client';
import { searchPublishedListings } from '@/lib/dbSearch';
import { sharedRateLimit } from '@/lib/sharedRateLimit';
import { clientIp } from '@/lib/clientIp';

/**
 * GET /api/search?q=...&type=...&city=...&sort=...
 * Published rows are filtered, counted, sorted and paginated in Postgres;
 * only the requested result page is hydrated in application memory.
 */
function num(raw: string | null, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (raw === null || raw === '' || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
function optionalNum(raw: string | null, min: number, max: number): number | undefined {
  if (raw === null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
}

export const GET: APIRoute = async ({ url, request }) => {
  if (!(await sharedRateLimit(`search:ip:${clientIp(request)}`, 90, 60 * 1000))) {
    return json({ ok: false, error: 'Too many search requests. Please slow down.' }, 429);
  }
  const sp = url.searchParams;
  const allowedSorts = ['relevance', 'distance', 'rating', 'newest', 'recently-updated', 'featured', 'recommended', 'popular'] as const;
  const requestedSort = sp.get('sort') ?? '';
  const sort = allowedSorts.includes(requestedSort as (typeof allowedSorts)[number])
    ? requestedSort as (typeof allowedSorts)[number]
    : 'relevance';
  const filters = {
    q: (sp.get('q') ?? '').slice(0, 300),
    near: sp.get('near')?.slice(0, 160) || undefined,
    type: sp.getAll('type').slice(0, 12),
    denomination: sp.getAll('denomination').slice(0, 12),
    industry: sp.getAll('industry').slice(0, 12),
    profession: sp.getAll('profession').slice(0, 12),
    category: sp.getAll('category').slice(0, 12),
    service: sp.getAll('service').flatMap((value) => value.split(',').map((item) => item.trim().slice(0, 200)).filter(Boolean)).slice(0, 12),
    city: sp.get('city')?.slice(0, 120) || undefined,
    region: sp.get('region')?.slice(0, 120) || undefined,
    postal: sp.get('postal')?.slice(0, 24) || undefined,
    lat: optionalNum(sp.get('lat'), -90, 90),
    lng: optionalNum(sp.get('lng'), -180, 180),
    radiusMi: num(sp.get('radiusMi'), 25, 1, 500),
    verifiedOnly: sp.get('verifiedOnly') === '1',
    openNow: sp.get('openNow') === '1',
    onlineOnly: sp.get('onlineOnly') === '1',
    minRating: num(sp.get('minRating'), 0, 0, 5),
    price: sp.getAll('price').slice(0, 8),
    languages: sp.getAll('languages').slice(0, 12),
    accessibility: sp.getAll('accessibility').slice(0, 12),
    sort,
    page: Math.floor(num(sp.get('page'), 1, 1, 10_000)),
    perPage: Math.floor(num(sp.get('perPage'), 12, 1, 50)),
  };

  const requestId = crypto.randomUUID();
  try {
    const result = await searchPublishedListings(filters, requestId);
    return json({ mode: hasDatabase() ? 'postgres' : 'memory-empty', ...result });
  } catch {
    console.error('[api/search] failed to serve search request', { requestId });
    return json({ ok: false, error: 'Search is temporarily unavailable.', requestId }, 503);
  }
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': status === 429 || status >= 500 ? 'no-store' : 'public, max-age=0, s-maxage=30, stale-while-revalidate=60',
    },
  });
}
