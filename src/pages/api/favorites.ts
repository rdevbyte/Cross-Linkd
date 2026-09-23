import type { APIRoute } from 'astro';
import { getPublicListings } from '@/lib/publicListings';
import type { SampleListing } from '@/data/listings';

/** GET /api/favorites?ids=l01,l02 — hydrate favorite cards. */
export const GET: APIRoute = async ({ url }) => {
  const ids = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean);
  const allListings = await getPublicListings();
  const found = allListings.filter((l: SampleListing) => ids.includes(l.id) || ids.includes(l.slug));
  return new Response(JSON.stringify({ listings: found }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
