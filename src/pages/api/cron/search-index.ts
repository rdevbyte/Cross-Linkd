import type { APIRoute } from 'astro';

/** GET /api/cron/search-index — recompute counters / refresh external index (Meilisearch-ready). */
export const GET: APIRoute = async ({ request }) => {
  const auth = request.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  // Production: UPDATE listings SET review_count/avg_rating...; push deltas to Meilisearch.
  console.log('[cron] search index maintenance ran at', new Date().toISOString());
  return new Response(JSON.stringify({ ok: true, at: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
