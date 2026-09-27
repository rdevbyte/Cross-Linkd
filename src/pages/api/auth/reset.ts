import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { users, authTokens } from '@/db/schema';
import { resetRequestSchema, resetConfirmSchema } from '@/lib/validation';
import { createAuthToken, consumeAuthToken, hashPassword } from '@/lib/auth';
import { sendMail, appUrl } from '@/lib/mailer';
import { rateLimit } from '@/lib/rateLimit.mjs';
import { clientIp } from '@/lib/clientIp';

/**
 * POST /api/auth/reset                    — request a reset link (no user enumeration).
 * POST /api/auth/reset  (intent=confirm)  — consume token + set new password (form rendered by /auth/reset?token=…).
 */
export const POST: APIRoute = async ({ request, redirect }) => {
  if (!hasDatabase()) {
    return redirect('/auth/reset?error=' + encodeURIComponent('Password reset is unavailable in this preview.'), 303);
  }
  const db = getDb()!;
  const form = await request.formData();
  const isConfirm = form.get('intent') === 'confirm';

  if (!rateLimit(`reset:ip:${clientIp(request)}`, 10, 15 * 60 * 1000)) {
    return redirect('/auth/reset?error=' + encodeURIComponent('Too many attempts. Wait 15 minutes and try again.'), 303);
  }

  if (isConfirm) {
    const parsed = resetConfirmSchema.safeParse({
      token: String(form.get('token') ?? ''),
      password: String(form.get('password') ?? ''),
    });
    if (!parsed.success) {
      const token = String(form.get('token') ?? '');
      const message = parsed.error.errors[0]?.message ?? 'Invalid reset link.';
      // Keep the token in the URL so the user can correct the password without a new email.
      return redirect(`/auth/reset?token=${encodeURIComponent(token)}&error=${encodeURIComponent(message)}`, 303);
    }
    const result = await consumeAuthToken(db, authTokens, parsed.data.token, 'password_reset');
    if (!result) return redirect('/auth/reset?error=' + encodeURIComponent('This reset link is invalid or has expired. Request a new one.'), 303);
    // New password + revoke every session that was open before the reset.
    await db.update(users)
      .set({ passwordHash: await hashPassword(parsed.data.password), sessionsValidAfter: new Date(), updatedAt: new Date() })
      .where(eq(users.id, result.userId));
    return redirect('/auth/signin?notice=password-reset', 303);
  }

  const parsed = resetRequestSchema.safeParse({ email: String(form.get('email') ?? '').toLowerCase().trim() });
  if (parsed.success && !rateLimit(`reset:email:${parsed.data.email}`, 3, 15 * 60 * 1000)) {
    // Same response as success — throttled silently, no enumeration.
    return redirect('/auth/reset?sent=1', 303);
  }
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
