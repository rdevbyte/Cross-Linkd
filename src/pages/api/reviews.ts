import type { APIRoute } from 'astro';
import { getDb, hasDatabase } from '@/db/client';
import { reviews } from '@/db/schema';
import { reviewInputSchema } from '@/lib/validation';
import { sharedRateLimit } from '@/lib/sharedRateLimit';
import { clientIp } from '@/lib/clientIp';

/** POST /api/reviews — submit a review (starts in `pending` for moderation). */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const parsed = reviewInputSchema.safeParse({
    listingId: String(form.get('listingId') ?? ''),
    rating: Number(form.get('rating') ?? 5),
    title: String(form.get('title') ?? ''),
    body: String(form.get('body') ?? ''),
  });
  if (!parsed.success) return redirect('/search?error=invalid-review', 303);
  const key = locals.user?.id ? `review:user:${locals.user.id}` : `review:ip:${clientIp(request)}`;
  if (!(await sharedRateLimit(key, locals.user?.id ? 20 : 5, 60 * 60 * 1000))) {
    return redirect('/search?error=review-rate-limited', 303);
  }

  // Light anti-spam: block links in demo path (production adds Turnstile + rate limits).
  if (/https?:\/\//i.test(parsed.data.body ?? '')) {
    return redirect('/search?error=review-links-blocked', 303);
  }

  if (hasDatabase()) {
    try {
      const db = getDb()!;
      await db.insert(reviews).values({
        listingId: parsed.data.listingId,
        authorId: locals.user?.id ?? null,
        rating: parsed.data.rating,
        title: parsed.data.title || null,
        body: parsed.data.body || null,
        status: 'pending',
      });
    } catch (err) {
      // Do not report success for a review that was never stored.
      console.error('[api/reviews] failed:', err instanceof Error ? err.message : err);
      return redirect('/search?error=review-failed', 303);
    }
  } else {
    console.log('[demo] review submitted:', parsed.data);
  }
  return redirect('/search?review=submitted', 303);
};
