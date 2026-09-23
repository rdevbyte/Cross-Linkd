import type { APIRoute } from 'astro';
import { z } from 'zod';
import { sendMail } from '@/lib/mailer';

const schema = z.object({
  name: z.string().min(2).max(120),
  topic: z.string().min(2).max(120),
  email: z.string().email(),
  message: z.string().min(10).max(3000),
});

/** POST /api/contact — validated, delivered via the mail adapter (Resend or server log). */
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const parsed = schema.safeParse({
    name: String(form.get('name') ?? '').trim(),
    topic: String(form.get('topic') ?? '').trim() || 'General question',
    email: String(form.get('email') ?? '').toLowerCase().trim(),
    message: String(form.get('message') ?? '').trim(),
  });
  if (!parsed.success) {
    return redirect(`/contact?error=${encodeURIComponent(parsed.error.errors[0]?.message ?? 'Please complete the form.')}`, 303);
  }
  const { name, topic, email, message } = parsed.data;
  await sendMail({
    to: process.env.CONTACT_INBOX ?? 'support@crosslinkd.example.com',
    subject: `[Contact] ${topic} — ${name}`,
    text: `From: ${name} <${email}>\nTopic: ${topic}\n\n${message}`,
  });
  return redirect('/contact?sent=1', 303);
};
