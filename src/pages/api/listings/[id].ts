import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { canonicalIndustrySlug } from '@/data/industries';
import { listings, listingLocations, listingProfessions, professions, listingServices, listingIndustries, industries } from '@/db/schema';
import { listingPatchSchema } from '@/lib/validation';
import { isUuid } from '@/lib/formGuards.mjs';
import { saveListing, duplicateExists, rowToFormValues, resolveListingStatus, TaxonomyCatalogUnavailableError, type ListingFormValues } from '@/lib/submissions';
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
  const [professionRows, serviceRows, industryRows] = await Promise.all([
    db.select({ slug: professions.slug }).from(listingProfessions).innerJoin(professions, eq(listingProfessions.professionId, professions.id)).where(eq(listingProfessions.listingId, id)),
    db.select({ name: listingServices.name }).from(listingServices).where(eq(listingServices.listingId, id)),
    db.select({ slug: industries.slug }).from(listingIndustries).innerJoin(industries, eq(listingIndustries.industryId, industries.id)).where(eq(listingIndustries.listingId, id)),
  ]);
  const secondaryIndustries = industryRows.map((row) => row.slug).filter((slug) => canonicalIndustrySlug(slug) !== canonicalIndustrySlug(current.industrySlug ?? ''));
  const values: ListingFormValues = { ...rowToFormValues(current, loc, { professions: professionRows.map((row) => row.slug), services: serviceRows.map((row) => row.name), industries: secondaryIndustries }), ...parsed.data.listing };

  if (values.denominations && values.denominations.length > 2) {
    return jsonError(400, 'You can select up to two denominations.');
  }

  const resultingStatus = resolveListingStatus(action, { listingId: id, currentStatus: current.status });
  if (resultingStatus !== 'draft') {
    if (!values.description || values.description.trim().length < 30) return jsonError(400, 'A description of at least 30 characters is required.');
    if (!values.isOnlineOnly && (!values.city?.trim() || !values.region?.trim())) return jsonError(400, 'City and state/region are required to publish.');
    if (!values.email && !values.phone) return jsonError(400, 'Provide a contact email or phone number.');
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
    if (err instanceof TaxonomyCatalogUnavailableError) return jsonError(503, err.message);
    if (err instanceof Error && /Choose a valid|does not belong|Unknown profession|Unknown industry|Choose an industry|category before/i.test(err.message)) return jsonError(400, err.message);
    console.error('[api/listings] patch failed:', err);
    return jsonError(500, 'Could not save the listing. Please try again.');
  }
};

/** DELETE /api/listings/[id] — permanently delete only a listing owned by the signed-in user. */
export const DELETE: APIRoute = async ({ params, locals }) => {
  const deny = apiGuard.user(locals);
  if (deny) return deny;
  if (!hasDatabase()) return jsonError(503, 'Submissions are unavailable in this preview.');
  const id = params.id ?? '';
  if (!isUuid(id)) return jsonError(404, 'Listing not found.');
  const db = getDb()!;
  // Keep the ownership predicate in the destructive statement itself. Related
  // listing rows are removed by their declared foreign-key cascades.
  const [deleted] = await db.delete(listings)
    .where(and(eq(listings.id, id), eq(listings.ownerId, locals.user!.id)))
    .returning({ id: listings.id });
  if (!deleted) return jsonError(404, 'Listing not found.');
  return jsonOk({ deleted: true });
};
