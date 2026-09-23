import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { users, authTokens } from '@/db/schema';
import { signupSchema } from '@/lib/validation';
import { hashPassword, createSessionToken, sessionCookie, createAuthToken } from '@/lib/auth';
import { sendMail, appUrl } from '@/lib/mailer';

/** POST /api/auth/signup — email + password registration with email verification. */
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const parsed = signupSchema.safeParse({
    email: String(form.get('email') ?? '').toLowerCase().trim(),
    password: String(form.get('password') ?? ''),
    displayName: String(form.get('displayName') ?? '').trim(),
  });
  if (!parsed.success) {
    return redirect(`/auth/signup?error=${encodeURIComponent(parsed.error.errors[0]?.message ?? 'Invalid entries.')}`, 303);
  }
  if (!hasDatabase()) {
    return redirect('/auth/signup?error=' + encodeURIComponent('Accounts are unavailable in this preview (no database configured).'), 303);
  }
  const db = getDb()!;
  try {
    const existing = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
    if (existing.length) return redirect('/auth/signup?error=An+account+with+that+email+already+exists.', 303);

    // Role is ALWAYS 'member' at signup — administrators are promoted only
    // through the secure flows (scripts/admin-promote.ts or /admin/setup).
    const [created] = await db.insert(users).values({
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      displayName: parsed.data.displayName,
      role: 'member',
    }).returning({ id: users.id, email: users.email, displayName: users.displayName, role: users.role });

    const raw = await createAuthToken(db, authTokens, created.id, 'email_verify', 1000 * 60 * 60 * 48);
    await sendMail({
      to: created.email,
      subject: 'Verify your CrossLinkd email',
      text: `Welcome to CrossLinkd!\n\nConfirm your email address:\n${appUrl(`/api/auth/verify?token=${raw}`)}\n\nThis link expires in 48 hours.`,
    });

    const token = await createSessionToken({
      id: created.id, email: created.email,
      displayName: created.displayName ?? 'Member', role: created.role,
    });
    return new Response(null, { status: 303, headers: { Location: '/dashboard?notice=verify-email', 'Set-Cookie': sessionCookie(token) } });
  } catch (err) {
    console.error('[auth/signup] failed:', err);
    return redirect('/auth/signup?error=Something+went+wrong.+Please+try+again.', 303);
  }
};
