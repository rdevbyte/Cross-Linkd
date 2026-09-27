import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { listings, listingLocations } from '@/db/schema';
import { listingPatchSchema } from '@/lib/validation';
import { saveListing, duplicateExists, rowToFormValues, type ListingFormValues } from '@/lib/submissions';
import { apiGuard, jsonError, jsonOk } from '@/lib/guards';

/** Owners may edit anything that is not staff-locked (`suspended`) or gone (`archived`). */
const EDITABLE_FOR_OWNER = new Set(['draft', 'pending_review', 'published', 'rejected', 'changes_requested']);

async function loadOwned(id: string, userId: string) {
  const db = getDb()!;
  const rows = await db.select().from(listings).where(and(eq(listings.id, id), eq(listings.ownerId, userId))).limit(1);
  return rows[0] ?? null;
}

/**
 * PATCH /api/listings/[id] — owner updates their listing. The payload is merged over
 * the stored values, so a partial PATCH never resets fields (location, privacy
 * flags, denominations…) the client did not send.
 */
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

  const current = await loadOwned(id, locals.user!.id);
  if (!current) return jsonError(404, 'Listing not found.');
  if (!EDITABLE_FOR_OWNER.has(current.status)) {
    return jsonError(409, `Listings with status "${current.status}" cannot be edited.`);
  }

  const db = getDb()!;
  const [loc] = await db
    .select({ city: listingLocations.city, region: listingLocations.region, postalCode: listingLocations.postalCode })
    .from(listingLocations)
    .where(and(eq(listingLocations.listingId, id), eq(listingLocations.isPrimary, true)))
    .limit(1);
  const values: ListingFormValues = { ...rowToFormValues(current, loc), ...parsed.data.listing };

  if (values.denominations && values.denominations.length > 2) {
    return jsonError(400, 'You can select up to two denominations.');
  }

  if (action !== 'draft') {
    if (values.description && values.description.trim().length < 30) {
      return jsonError(400, 'A description of at least 30 characters is required.');
    }
    if (await duplicateExists(locals.user!.id, values.name, values.city, id)) {
      return jsonError(409, 'You already have another listing with this name in this city.');
    }
  }

  try {
    const saved = await saveListing(locals.user!.id, values, {
      listingId: id,
      action,
      currentStatus: current.status,
    });
    return jsonOk({ listing: saved });
  } catch (err) {
    console.error('[api/listings] patch failed:', err);
    return jsonError(500, 'Could not save the listing. Please try again.');
  }
};

/** DELETE /api/listings/[id] — owner removes their listing. */
export const DELETE: APIRoute = async ({ params, locals }) => {
  const deny = apiGuard.user(locals);
  if (deny) return deny;
  if (!hasDatabase()) return jsonError(503, 'Submissions are unavailable in this preview.');
  const id = params.id ?? '';
  const db = getDb()!;
  const current = await loadOwned(id, locals.user!.id);
  if (!current) return jsonError(404, 'Listing not found.');
  await db.update(listings).set({ deletedAt: new Date(), status: 'archived' }).where(eq(listings.id, id));
  return jsonOk();
};
