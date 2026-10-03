import type { APIRoute } from 'astro';
import { and, eq, gt, isNull, lt, sql } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { listingAnalyticsEvents, listings } from '@/db/schema';
import { clientIp } from '@/lib/clientIp';
import { isListingAnalyticsEvent } from '@/lib/listingAnalyticsEvents.mjs';
import { RECENTLY_UPDATED_WINDOW_MS } from '@/lib/recentlyUpdated.mjs';
import { sharedRateLimit } from '@/lib/sharedRateLimit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let acceptedEvents = 0;

/** Privacy-minimized event collection: listing id + event + time; never store visitor/IP/referrer data. */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!hasDatabase()) return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  if (!(await sharedRateLimit(`listing-analytics:ip:${clientIp(request)}`, 240, 60 * 1000))) {
    return new Response(null, { status: 429, headers: { 'Cache-Control': 'no-store' } });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!body || typeof body !== 'object' || !isListingAnalyticsEvent((body as { event?: unknown }).event)) {
    return Response.json({ ok: false, error: 'Invalid analytics event.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const eventName = (body as { event: string }).event;
  const rawListingId = (body as { listingId?: unknown }).listingId;
  const listingId = typeof rawListingId === 'string' && UUID_RE.test(rawListingId) ? rawListingId : undefined;
  if (eventName === 'recent_filter') {
    if (rawListingId !== undefined) return Response.json({ ok: false, error: 'This event does not accept a listing id.' }, { status: 400 });
  } else if (!listingId) {
    return Response.json({ ok: false, error: 'A valid listing id is required.' }, { status: 400 });
  }
  if (eventName === 'owner_share' && !locals.user) return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

  const db = getDb();
  if (!db) return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  const now = new Date();
  const conditions = [eq(listings.status, 'published'), isNull(listings.deletedAt)];
  if (listingId) conditions.unshift(eq(listings.id, listingId));
  if (eventName === 'recent_impression' || eventName === 'recent_card_click' || eventName === 'owner_share') {
    conditions.push(gt(listings.recentlyUpdatedAt, new Date(now.getTime() - RECENTLY_UPDATED_WINDOW_MS)));
    conditions.push(lt(listings.recentlyUpdatedAt, now));
  }
  if (eventName === 'owner_share') conditions.push(eq(listings.ownerId, locals.user!.id));
  const [listing] = listingId
    ? await db.select({ id: listings.id }).from(listings).where(and(...conditions)).limit(1)
    : [];
  if (eventName !== 'recent_filter' && !listing) return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

  try {
    await db.transaction(async (tx) => {
      await tx.insert(listingAnalyticsEvents).values({ listingId: listingId ?? null, eventName });
      if (eventName === 'detail_view' && listingId) {
        await tx.update(listings).set({ viewCount: sql`${listings.viewCount} + 1` }).where(eq(listings.id, listingId));
      }
    });
    acceptedEvents += 1;
    if (acceptedEvents % 512 === 0) {
      try {
        await db.delete(listingAnalyticsEvents).where(lt(listingAnalyticsEvents.createdAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)));
      } catch (error) {
        console.error('[listing-analytics] retention cleanup failed', { message: error instanceof Error ? error.message : String(error) });
      }
    }
  } catch (error) {
    console.error('[listing-analytics] write failed', { message: error instanceof Error ? error.message : String(error) });
    return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
};
