import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { users, authTokens } from '@/db/schema';
import { consumeAuthToken, createSessionToken, sessionCookie } from '@/lib/auth';

/**
 * GET /api/auth/verify?token=… — consumes an email-verification token.
 * Single use, 48h expiry, hash-stored.
 */
export const GET: APIRoute = async ({ url, redirect }) => {
  const raw = url.searchParams.get('token') ?? '';
  if (!raw || !hasDatabase()) return redirect('/dashboard?notice=verification-failed', 303);
  const db = getDb()!;
  const result = await consumeAuthToken(db, authTokens, raw, 'email_verify');
  if (!result) return redirect('/dashboard?notice=verification-failed', 303);
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, result.userId));
  return redirect('/dashboard?notice=email-verified', 303);
};
