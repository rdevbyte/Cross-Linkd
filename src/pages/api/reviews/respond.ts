import type { APIRoute } from 'astro';

/** POST /api/reviews/respond — owner response to a review. */
export const POST: APIRoute = async ({ redirect }) => {
  return redirect('/dashboard/reviews', 303);
};
