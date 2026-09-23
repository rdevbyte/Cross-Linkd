import type { APIRoute } from 'astro';

/** POST /api/verifications — submit verification evidence. */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  console.log('[demo] verification submitted:', {
    type: String(form.get('type') ?? ''),
    notes: String(form.get('notes') ?? '').slice(0, 200),
    by: locals.user?.email ?? 'guest',
    doc: (form.get('document') as File | null)?.name ?? 'none',
  });
  // Production: upload doc to Blob/S3, insert verification_requests row.
  return redirect('/dashboard/verification?submitted=1', 303);
};
