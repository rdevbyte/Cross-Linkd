import type { APIRoute } from 'astro';
import { z } from 'zod';
import { sendMail } from '@/lib/mailer';

const schema = z.object({
  category: z.string().max(80).default('General suggestion'),
  message: z.string().min(10, 'Please enter at least 10 characters.').max(3000),
  email: z.string().email('Please enter a valid email address.').optional().or(z.literal('')),
  name: z.string().max(100).optional().or(z.literal('')),
  website_hp: z.string().optional(),
});

/** POST /api/feedback — handle user suggestions and site improvements. */
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const hp = String(form.get('website_hp') ?? '');
  if (hp) {
    // Silent drop for automated bots filling hidden field
    return redirect('/feedback?sent=1', 303);
  }

  const parsed = schema.safeParse({
    category: String(form.get('category') ?? 'General suggestion').trim(),
    message: String(form.get('message') ?? '').trim(),
    email: String(form.get('email') ?? '').trim().toLowerCase() || undefined,
    name: String(form.get('name') ?? '').trim() || undefined,
  });

  if (!parsed.success) {
    const errorMsg = parsed.error.errors[0]?.message ?? 'Please check your entry.';
    return redirect(`/feedback?error=${encodeURIComponent(errorMsg)}`, 303);
  }

  const { category, message, email, name } = parsed.data;
  const senderName = name || 'Community Member';
  const senderEmail = email || 'feedback-no-reply@crosslinkd.app';

  await sendMail({
    to: process.env.CONTACT_INBOX ?? 'feedback@crosslinkd.app',
    replyTo: senderEmail,
    subject: `[Improvement Suggestion] ${category} — ${senderName}`,
    text: `Category: ${category}\nFrom: ${senderName} (${email || 'No email provided'})\nReply-To: ${senderEmail}\n\nSuggestion:\n${message}`,
  });

  return redirect('/feedback?sent=1', 303);
};
