import type { APIRoute } from 'astro';
import { and, eq, isNull } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { listingClaims, listings } from '@/db/schema';
import { claimError, honeypotTripped, isUuid } from '@/lib/formGuards.mjs';
import { sharedRateLimit } from '@/lib/sharedRateLimit';

function clientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

/** POST /api/claims — save a claim request. A saved claim is not an ownership verification. */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const get = (key: string) => String(form.get(key) ?? '').trim();
  const fail = (message: string) => redirect(`/claim-listing?error=${encodeURIComponent(message)}`, 303);

  if (honeypotTripped(form.get('hp_company'))) return fail('Please check your entries and try again.');
  if (!(await sharedRateLimit(`claim:${clientIp(request)}`, 5, 60 * 60 * 1000))) {
    return fail('Too many claim requests from this network. Wait an hour and try again.');
  }

  const problem = claimError({
    listingId: get('listingId'),
    claimantName: get('claimantName'),
    claimantEmail: get('claimantEmail'),
    relationship: get('relationship'),
    evidence: get('evidence'),
  });
  if (problem) return fail(problem);
  if (!hasDatabase()) {
    return fail('We could not save your claim because the directory database is not connected. Please try again later.');
  }

  try {
    const db = getDb();
    if (!db) {
      return fail('We could not save your claim because the directory database is not connected. Please try again later.');
    }
    const listingRef = get('listingId');
    if (!isUuid(listingRef)) return fail('Select an available published listing.');
    const [found] = await db.select({ id: listings.id }).from(listings).where(and(
      eq(listings.id, listingRef),
      eq(listings.status, 'published'),
      isNull(listings.deletedAt),
      isNull(listings.ownerId),
      eq(listings.isClaimed, false),
    )).limit(1);
    if (!found) return fail('This listing is no longer available to claim. Choose an unowned published listing.');
    await db.insert(listingClaims).values({
      listingId: found.id,
      claimantId: locals.user?.id ?? null,
      claimantName: get('claimantName'),
      claimantEmail: get('claimantEmail'),
      relationship: get('relationship'),
      evidence: get('evidence'),
      status: 'pending',
    });
  } catch (err) {
    console.error('[api/claims] save failed', err instanceof Error ? err.name : 'error');
    return fail('We could not save your claim. Please try again.');
  }

  return redirect('/claim-listing?success=1', 303);
};
