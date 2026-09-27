import type { APIRoute } from 'astro';
import { and, eq, isNull } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { listings, users } from '@/db/schema';

/** GET /api/account/export — JSON copy of the signed-in profile. Never includes the password hash. */
export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: 'Sign in to download your account data.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
  if (!hasDatabase()) {
    return new Response(JSON.stringify({ ok: false, error: 'The directory database is not connected, so a full export is not available.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  try {
    const db = getDb();
    if (!db) {
      return new Response(JSON.stringify({ ok: false, error: 'The directory database is not connected, so a full export is not available.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }
    const profile = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
        notificationPrefs: users.notificationPrefs,
        createdAt: users.createdAt,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    const mine = await db
      .select({
        id: listings.id,
        slug: listings.slug,
        name: listings.name,
        status: listings.status,
        email: listings.email,
        phone: listings.phone,
        updatedAt: listings.updatedAt,
      })
      .from(listings)
      .where(and(eq(listings.ownerId, user.id), isNull(listings.deletedAt)));
    const payload = {
      exportedAt: new Date().toISOString(),
      account: profile[0] ?? { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
      listings: mine,
      note: 'This file does not include your password. Deleting the account does not automatically unpublish listings.',
    };
    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="crosslinkd-account.json"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[api/account/export] failed', err instanceof Error ? err.name : 'error');
    return new Response(JSON.stringify({ ok: false, error: 'We could not build your export. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
};
