import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { users, authTokens } from '@/db/schema';
import { resetRequestSchema, resetConfirmSchema } from '@/lib/validation';
import { createAuthToken, consumeAuthToken, hashPassword } from '@/lib/auth';
import { sendMail, appUrl } from '@/lib/mailer';

/**
 * POST /api/auth/reset            — request a reset link (no user enumeration).
 * POST /api/auth/reset?confirm=1  — consume token + set new password.
 */
export const POST: APIRoute = async ({ request, redirect }) => {
  if (!hasDatabase()) {
    return redirect('/auth/reset?error=' + encodeURIComponent('Password reset is unavailable in this preview.'), 303);
  }
  const db = getDb()!;
  const form = await request.formData();
  const isConfirm = form.get('intent') === 'confirm';

  if (isConfirm) {
    const parsed = resetConfirmSchema.safeParse({
      token: String(form.get('token') ?? ''),
      password: String(form.get('password') ?? ''),
    });
    if (!parsed.success) {
      return redirect(`/auth/reset?error=${encodeURIComponent(parsed.error.errors[0]?.message ?? 'Invalid reset link.')}`, 303);
    }
    const result = await consumeAuthToken(db, authTokens, parsed.data.token, 'password_reset');
    if (!result) return redirect('/auth/reset?error=' + encodeURIComponent('This reset link is invalid or has expired. Request a new one.'), 303);
    await db.update(users).set({ passwordHash: await hashPassword(parsed.data.password) }).where(eq(users.id, result.userId));
    return redirect('/auth/signin?notice=password-reset', 303);
  }

  const parsed = resetRequestSchema.safeParse({ email: String(form.get('email') ?? '').toLowerCase().trim() });
  if (parsed.success) {
    const found = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
    const u = found[0];
    if (u && !u.deletedAt) {
      const raw = await createAuthToken(db, authTokens, u.id, 'password_reset', 1000 * 60 * 60);
      await sendMail({
        to: u.email,
        subject: 'Reset your CrossLinkd password',
        text: `Reset your password:\n${appUrl(`/auth/reset?token=${raw}`)}\n\nThis link expires in 1 hour. If you didn't request it, you can ignore this email.`,
      });
    }
  }
  // Same response whether or not the account exists (no enumeration).
  return redirect('/auth/reset?sent=1', 303);
};
