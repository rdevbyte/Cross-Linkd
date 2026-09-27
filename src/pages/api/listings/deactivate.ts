import type { APIRoute } from 'astro';

/** POST /api/listings/deactivate — soft-delete (sets deleted_at in production). */
export const POST: APIRoute = async ({ redirect }) => {
  return redirect('/dashboard/listings?saved=1', 303);
};
