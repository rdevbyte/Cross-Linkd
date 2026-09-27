import type { APIRoute } from 'astro';
import { cronAuthorized } from '@/lib/cronAuth';

/** GET /api/cron/search-index — recompute counters / refresh external index (Meilisearch-ready). */
export const GET: APIRoute = async ({ request }) => {
  if (!cronAuthorized(request)) return new Response('Unauthorized', { status: 401 });
  // Production: UPDATE listings SET review_count/avg_rating...; push deltas to Meilisearch.
  console.log('[cron] search index maintenance ran at', new Date().toISOString());
  return new Response(JSON.stringify({ ok: true, at: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
