import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { listings } from '@/db/schema';
import { listingInputSchema, listingPatchSchema } from '@/lib/validation';
import { saveListing, duplicateExists, type ListingFormValues } from '@/lib/submissions';
import { apiGuard, jsonError, jsonOk } from '@/lib/guards';

const EDITABLE_FOR_OWNER = new Set(['draft', 'pending_review', 'rejected', 'changes_requested']);

async function loadOwned(id: string, userId: string, isStaffUser: boolean) {
  const db = getDb()!;
  const rows = await db.select().from(listings).where(and(eq(listings.id, id), eq(listings.ownerId, userId))).limit(1);
  return rows[0] ?? null;
}

/** PATCH /api/listings/[id] — owner edits, submits, or resubmits their listing. */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const deny = apiGuard.user(locals);
  if (deny) return deny;
  if (!hasDatabase()) return jsonError(503, 'Submissions are unavailable in this preview.');
  const id = params.id ?? '';
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, 'Invalid JSON body.'); }

  const parsed = listingPatchSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.errors[0]?.message ?? 'Invalid data.');
  const { action } = parsed.data;

  const current = await loadOwned(id, locals.user!.id, false);
  // 404 (not 403) avoids confirming other people's listing ids exist.
  if (!current) return jsonError(404, 'Listing not found.');
  if (!EDITABLE_FOR_OWNER.has(current.status)) {
    return jsonError(409, `Listings with status "${current.status}" cannot be edited here.`);
  }

  const values: ListingFormValues = { ...current, ...parsed.data.listing } as ListingFormValues;

  if (action === 'submit' || action === 'resubmit') {
    if (!values.description || values.description.trim().length < 30) {
      return jsonError(400, 'A description of at least 30 characters is required to submit.');
    }
    if (!values.city?.trim() || !values.region?.trim()) return jsonError(400, 'City and state/region are required to submit.');
    if (!values.email && !values.phone) return jsonError(400, 'Provide a contact email or phone number.');
    if (await duplicateExists(locals.user!.id, values.name, values.city!, id)) {
      return jsonError(409, 'You already have another listing with this name in this city.');
    }
  }

  try {
    const saved = await saveListing(locals.user!.id, values, {
      listingId: id,
      action: action === 'save' ? 'draft' : action,
      currentStatus: current.status,
    });
    return jsonOk({ listing: saved });
  } catch (err) {
    console.error('[api/listings] patch failed:', err);
    return jsonError(500, 'Could not save the listing. Please try again.');
  }
};

/** DELETE /api/listings/[id] — owner removes their listing (published rows require an admin). */
export const DELETE: APIRoute = async ({ params, locals }) => {
  const deny = apiGuard.user(locals);
  if (deny) return deny;
  if (!hasDatabase()) return jsonError(503, 'Submissions are unavailable in this preview.');
  const id = params.id ?? '';
  const db = getDb()!;
  const current = await loadOwned(id, locals.user!.id, false);
  if (!current) return jsonError(404, 'Listing not found.');
  if (current.status === 'published') {
    return jsonError(409, 'Published listings can only be removed by an administrator.');
  }
  await db.update(listings).set({ deletedAt: new Date(), status: 'archived' }).where(eq(listings.id, id));
  return jsonOk();
};
