import type { APIRoute } from 'astro';

/** POST /api/events — create an event (pending moderation). */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  console.log('[demo] event created:', {
    title: String(form.get('title') ?? ''), date: String(form.get('date') ?? ''),
    by: locals.user?.email ?? 'guest',
  });
  return redirect('/dashboard/events?created=1', 303);
};
