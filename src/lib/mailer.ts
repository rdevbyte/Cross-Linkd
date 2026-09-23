/**
 * Email delivery adapter.
 * Production: set RESEND_API_KEY (and optionally MAIL_FROM) — mail is sent via
 * the Resend REST API. Without a key, messages are logged server-side so local
 * development and previews keep working without secrets.
 */
export interface MailMessage {
  to: string;
  subject: string;
  /** Plain-text body. Links must be absolute URLs. */
  text: string;
}

export function appUrl(path: string): string {
  const base = process.env.PUBLIC_SITE_URL ?? 'http://localhost:4321';
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function sendMail({ to, subject, text }: MailMessage): Promise<{ delivered: boolean; provider: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? 'CrossLinkd <onboarding@resend.dev>';
  if (!key) {
    console.log(`[email:console] to=${to} subject="${subject}"\n${text}`);
    return { delivered: false, provider: 'console' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text }),
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
