/**
 * Email delivery adapter.
 * Production: set RESEND_API_KEY (and optionally MAIL_FROM) — mail is sent via
 * the Resend REST API. Without a key, messages are logged server-side so local
 * development and previews keep working without secrets.
 */
import { resolveSiteUrl } from './siteUrl.mjs';

export interface MailMessage {
  to: string;
  subject: string;
  /** Plain-text body. Links must be absolute URLs. */
  text: string;
  replyTo?: string;
}

export function appUrl(path: string): string {
  return `${resolveSiteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function sendMail({ to, subject, text, replyTo }: MailMessage): Promise<{ delivered: boolean; provider: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? 'CrossLinkd <onboarding@resend.dev>';
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      // Never write sign-in / reset / verification links into production logs.
      console.error(`[email] RESEND_API_KEY is not set — message to ${to} ("${subject}") was NOT sent.`);
      return { delivered: false, provider: 'none' };
    }
    console.log(`[email:console] to=${to} replyTo=${replyTo ?? 'none'} subject="${subject}"\n${text}`);
    return { delivered: false, provider: 'console' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!res.ok) {
      console.error(`[email:resend] failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
      return { delivered: false, provider: 'resend' };
    }
    return { delivered: true, provider: 'resend' };
  } catch (err) {
    console.error('[email:resend] request threw:', err);
    return { delivered: false, provider: 'resend' };
  }
}
