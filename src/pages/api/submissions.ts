import type { APIRoute } from 'astro';
import { z } from 'zod';
import { listingInputSchema } from '@/lib/validation';
import { faithIdentityReason } from '@/lib/formGuards.mjs';
import { hasDatabase } from '@/db/client';
import { saveListing, duplicateExists, TaxonomyCatalogUnavailableError } from '@/lib/submissions';
import { apiGuard, jsonError, jsonOk } from '@/lib/guards';

/** POST /api/submissions — authenticated owner workflow: create and immediately publish a listing. */
export const POST: APIRoute = async ({ request, locals }) => {
  const deny = apiGuard.user(locals);
  if (deny) return deny;
  if (!hasDatabase()) return jsonError(503, 'Submissions are unavailable in this preview (no database configured).');

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, 'Invalid JSON body.'); }
  const parsedAction = z.object({ action: z.enum(['publish', 'draft', 'submit', 'resubmit', 'save']).default('publish') }).safeParse(body);
  if (!parsedAction.success) return jsonError(400, parsedAction.error.errors[0]?.message ?? 'Invalid listing action.');
  const action = parsedAction.data.action;

  const rawListing = (body as { listing?: unknown }).listing;
  const parsed = listingInputSchema.safeParse(rawListing);
  if (!parsed.success) return jsonError(400, parsed.error.errors[0]?.message ?? 'Invalid listing data.', { field: parsed.error.errors[0]?.path?.[0] });
  const values = parsed.data;

  if (values.denominations && values.denominations.length > 2) {
    return jsonError(400, 'You can select up to two denominations.');
  }

  if (action !== 'draft') {
    const faithError = faithIdentityReason(values);
    if (faithError) return jsonError(400, faithError, { field: 'denominations' });
    if (!values.description || values.description.trim().length < 30) {
      return jsonError(400, 'A description of at least 30 characters is required to publish.');
    }
    if (!values.isOnlineOnly && !values.city?.trim()) return jsonError(400, 'City is required to publish.');
    if (!values.isOnlineOnly && !values.region?.trim()) return jsonError(400, 'State/region is required to publish.');
    if (!values.email && !values.phone) return jsonError(400, 'Provide a contact email or phone number.');
    if (await duplicateExists(locals.user!.id, values.name, values.city)) {
      return jsonError(409, 'You already have a listing with this name in this city.');
    }
  }

  try {
    const saved = await saveListing(locals.user!.id, values, { action });
    return jsonOk({ listing: saved });
  } catch (err) {
    if (err instanceof TaxonomyCatalogUnavailableError) return jsonError(503, err.message);
    if (err instanceof Error && /Choose a valid|does not belong|Unknown profession|Unknown industry|Choose an industry|category before/i.test(err.message)) return jsonError(400, err.message);
    console.error('[api/submissions] create failed:', err);
    return jsonError(500, 'Could not save the listing. Please try again.');
  }
};
