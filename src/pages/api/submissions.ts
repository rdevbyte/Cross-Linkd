import type { APIRoute } from 'astro';
import { z } from 'zod';
import { listingInputSchema } from '@/lib/validation';
import { getDb, hasDatabase } from '@/db/client';
import { saveListing, duplicateExists } from '@/lib/submissions';
import { apiGuard, jsonError, jsonOk } from '@/lib/guards';

/** POST /api/submissions — authenticated owner workflow: create a draft or submit for review.
 *  (The public "suggest a listing" form posts to /api/listings separately.) */
export const POST: APIRoute = async ({ request, locals }) => {
  const deny = apiGuard.user(locals);
  if (deny) return deny;
  if (!hasDatabase()) return jsonError(503, 'Submissions are unavailable in this preview (no database configured).');

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, 'Invalid JSON body.'); }
  const parsedAction = z.object({ action: z.enum(['draft', 'submit', 'resubmit']) }).safeParse(body);
  if (!parsedAction.success) return jsonError(400, 'action must be draft, submit, or resubmit.');
  const action = parsedAction.data.action;

  const parsed = listingInputSchema.safeParse((body as { listing?: unknown }).listing);
  if (!parsed.success) return jsonError(400, parsed.error.errors[0]?.message ?? 'Invalid listing data.', { field: parsed.error.errors[0]?.path?.[0] });
  const values = parsed.data;

  if (action !== 'draft') {
    if (!values.description || values.description.trim().length < 30) {
      return jsonError(400, 'A description of at least 30 characters is required to submit.');
    }
    if (!values.city?.trim()) return jsonError(400, 'City is required to submit.');
    if (!values.region?.trim()) return jsonError(400, 'State/region is required to submit.');
    if (!values.email && !values.phone) return jsonError(400, 'Provide a contact email or phone number.');
    if (await duplicateExists(locals.user!.id, values.name, values.city)) {
      return jsonError(409, 'You already have a listing with this name in this city.');
    }
  }

  try {
    const saved = await saveListing(locals.user!.id, values, { action });
    return jsonOk({ listing: saved });
  } catch (err) {
    console.error('[api/submissions] create failed:', err);
    return jsonError(500, 'Could not save the listing. Please try again.');
  }
};
