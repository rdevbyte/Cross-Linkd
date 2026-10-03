import type { APIRoute } from 'astro';
import { and, eq, isNull } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { listings, reports } from '@/db/schema';
import { contactError, honeypotTripped, safeReturnPath } from '@/lib/formGuards.mjs';
import { sharedRateLimit } from '@/lib/sharedRateLimit';

function clientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

/** POST /api/contact — save a contact or listing-inquiry message. Does not send email. */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const get = (key: string) => String(form.get(key) ?? '').trim();
  const listingRef = get('listing');
  const listingPath = /^[a-z0-9-]{1,200}$/.test(listingRef) ? `/directory/${listingRef}` : '';
  const back = safeReturnPath(get('return') || listingPath, listingPath || '/contact');
  const fail = (message: string) => redirect(`${back}?error=${encodeURIComponent(message)}`, 303);

  if (honeypotTripped(form.get('hp_company'))) return fail('Please check your entries and try again.');
  if (!(await sharedRateLimit(`contact:${clientIp(request)}`, 8, 60 * 60 * 1000))) {
    return fail('Too many messages from this network. Wait an hour and try again.');
  }

  const problem = contactError({ name: get('name'), email: get('email'), message: get('message') });
  if (problem) return fail(problem);
  if (!hasDatabase()) {
    return fail('We could not save your message because the directory database is not connected. Please try again later.');
  }

  try {
    const db = getDb();
    if (!db) {
      return fail('We could not save your message because the directory database is not connected. Please try again later.');
    }
    let listingId: string | null = null;
    if (listingRef) {
      const match = await db
        .select({ id: listings.id })
        .from(listings)
        .where(and(eq(listings.slug, listingRef), isNull(listings.deletedAt)))
        .limit(1);
      listingId = match[0]?.id ?? null;
    }
    const details = [
      `Name: ${get('name')}`,
      `Contact: ${get('email')}`,
      listingRef ? `Listing: ${listingRef}` : '',
      '',
      get('message'),
    ].filter((line) => line !== '').join('\n').slice(0, 8000);
    await db.insert(reports).values({
      reporterId: locals.user?.id ?? null,
      listingId,
      reason: (get('topic') || 'General question').slice(0, 80),
      details,
      status: 'open',
    });
  } catch (err) {
    console.error('[api/contact] save failed', err instanceof Error ? err.name : 'error');
    return fail('We could not save your message. Please try again.');
  }

  return redirect(`${back}?sent=1`, 303);
};
