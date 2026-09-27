import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { users, authTokens } from '@/db/schema';
import { magicRequestSchema } from '@/lib/validation';
import { createAuthToken, consumeAuthToken, createSessionToken, sessionCookie, authConfigured } from '@/lib/auth';
import { sendMail, appUrl } from '@/lib/mailer';
import { rateLimit } from '@/lib/rateLimit.mjs';
import { clientIp } from '@/lib/clientIp';

/**
 * POST /api/auth/magic-link — email a sign-in link (also verifies the address).
 * GET  /api/auth/magic-link?token=…&next=… — consume the link and sign in.
 */
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const nextRaw = String(form.get('next') ?? '/dashboard');
  const next = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/dashboard';
  if (!hasDatabase()) return redirect(`/auth/signin?error=${encodeURIComponent('Magic links are unavailable in this preview.')}`, 303);
  const db = getDb()!;
  const parsed = magicRequestSchema.safeParse({
    email: String(form.get('email') ?? '').toLowerCase().trim(),
    next,
  });
  if (!parsed.success) return redirect('/auth/signin?error=Enter+a+valid+email.', 303);
  if (
    !rateLimit(`magic:ip:${clientIp(request)}`, 10, 15 * 60 * 1000) ||
    !rateLimit(`magic:email:${parsed.data.email}`, 5, 15 * 60 * 1000)
  ) {
    return redirect('/auth/signin?error=' + encodeURIComponent('Too many sign-in links requested. Wait 15 minutes and try again.'), 303);
  }

  const found = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  const u = found[0];
  if (u && !u.deletedAt) {
    const raw = await createAuthToken(db, authTokens, u.id, 'magic', 1000 * 60 * 15);
    await sendMail({
      to: u.email,
      subject: 'Your CrossLinkd sign-in link',
      text: `Sign in with this link (expires in 15 minutes):\n${appUrl(`/api/auth/magic-link?token=${raw}&next=${encodeURIComponent(parsed.data.next ?? '/dashboard')}`)}\n\nIf you didn't request it, you can ignore this email.`,
    });
  }
  return redirect(`/auth/signin?sent=magic&next=${encodeURIComponent(next)}`, 303);
};

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const raw = url.searchParams.get('token') ?? '';
  const nextRaw = url.searchParams.get('next') ?? '/dashboard';
  const next = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/dashboard';
  if (!raw || !hasDatabase()) return redirect('/auth/signin?error=' + encodeURIComponent('This sign-in link is invalid.'), 303);
  if (!authConfigured()) return redirect('/auth/signin?error=' + encodeURIComponent('Sign-in is temporarily unavailable. Please try again later.'), 303);
  const db = getDb()!;
  const result = await consumeAuthToken(db, authTokens, raw, 'magic');
  if (!result) return redirect('/auth/signin?error=' + encodeURIComponent('This sign-in link has expired. Request a new one.'), 303);
  const rows = await db.select().from(users).where(eq(users.id, result.userId)).limit(1);
  const u = rows[0];
  if (!u || u.deletedAt) return redirect('/auth/signin?error=' + encodeURIComponent('Account not found.'), 303);
  if (!u.emailVerifiedAt) await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, u.id));
  const token = await createSessionToken({ id: u.id, email: u.email, displayName: u.displayName ?? 'Member', role: u.role });
  return new Response(null, { status: 303, headers: { Location: next, 'Set-Cookie': sessionCookie(token) } });
};
