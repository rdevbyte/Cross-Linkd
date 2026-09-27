import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { users } from '@/db/schema';
import { signinSchema } from '@/lib/validation';
import { verifyPassword, createSessionToken, sessionCookie, authConfigured } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit.mjs';
import { clientIp } from '@/lib/clientIp';

/** POST /api/auth/signin — email + password. Sessions carry the role at sign-in time. */
export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const form = await request.formData();
    const next = String(form.get('next') ?? '/dashboard');
    const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
    const parsed = signinSchema.safeParse({
      email: String(form.get('email') ?? '').toLowerCase().trim(),
      password: String(form.get('password') ?? ''),
    });
    if (!parsed.success) return redirect('/auth/signin?error=Enter+a+valid+email+and+password.', 303);

    // Brute-force / credential-stuffing protection: per network and per account.
    if (
      !rateLimit(`signin:ip:${clientIp(request)}`, 20, 15 * 60 * 1000) ||
      !rateLimit(`signin:email:${parsed.data.email}`, 10, 15 * 60 * 1000)
    ) {
      return redirect('/auth/signin?error=' + encodeURIComponent('Too many sign-in attempts. Wait 15 minutes and try again.'), 303);
    }

    if (!hasDatabase()) {
      return redirect('/auth/signin?error=' + encodeURIComponent('Accounts are unavailable in this preview (no database configured).'), 303);
    }
    if (!authConfigured()) {
      console.error('[auth/signin] AUTH_SECRET is not set; sign-in is disabled.');
      return redirect('/auth/signin?error=' + encodeURIComponent('Sign-in is temporarily unavailable. Please try again later.'), 303);
    }
    const db = getDb()!;
    const found = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
    const u = found[0];
    if (!u || u.deletedAt || !u.passwordHash || !(await verifyPassword(parsed.data.password, u.passwordHash))) {
      return redirect('/auth/signin?error=Incorrect+email+or+password.', 303);
    }
    await db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, u.id));
    const token = await createSessionToken({
      id: u.id, email: u.email, displayName: u.displayName ?? 'Member', role: u.role,
    });
    return new Response(null, { status: 303, headers: { Location: safeNext, 'Set-Cookie': sessionCookie(token) } });
  } catch (err: unknown) {
    // Log the detail server-side only; never echo driver/infra errors to the browser.
    console.error('[auth/signin] failed:', err instanceof Error ? err.message : String(err));
    return redirect('/auth/signin?error=' + encodeURIComponent('Sign in failed. Please try again.'), 303);
  }
};
