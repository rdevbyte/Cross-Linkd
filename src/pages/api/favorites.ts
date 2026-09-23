import type { APIRoute } from 'astro';
import { SAMPLE_LISTINGS } from '@/data/listings';

/** GET /api/favorites?ids=l01,l02 — hydrate favorite cards (demo path). */
export const GET: APIRoute = async ({ url }) => {
  const ids = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean);
  const found = SAMPLE_LISTINGS.filter((l) => ids.includes(l.id) || ids.includes(l.slug));
  return new Response(JSON.stringify({ listings: found }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
