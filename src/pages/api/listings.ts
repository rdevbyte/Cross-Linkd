import type { APIRoute } from 'astro';
import { getDb, hasDatabase } from '@/db/client';
import { listings } from '@/db/schema';
import { listingInputSchema } from '@/lib/validation';
import { slugify } from '@/lib/slug';

/** POST /api/listings — create a listing (pending_review). Rate-limited in prod via Vercel Firewall rules. */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const get = (k: string) => String(form.get(k) ?? '').trim();

  const parsed = listingInputSchema.safeParse({
    name: get('name'),
    typeSlug: get('typeSlug'),
    tagline: get('tagline'),
    description: get('description'),
    website: get('website'),
    phone: get('phone'),
    email: get('email'),
    city: get('city'),
    region: get('region'),
    postalCode: get('postalCode'),
    isOnlineOnly: form.get('isOnlineOnly') === '1',
    priceRange: get('priceRange'),
    statementOfFaith: get('statementOfFaith'),
    industries: get('industries') ? [get('industries')] : [],
    denominations: get('denominations') ? [get('denominations')] : [],
    hashtags: get('hashtags') ? get('hashtags').split(',').map((s) => s.trim().replace(/^#/, '')).filter(Boolean) : [],
  });

  if (!parsed.success) {
    return redirect(`/add-listing?error=${encodeURIComponent(parsed.error.errors[0]?.message ?? 'Please check your entries.')}`, 303);
  }
  const d = parsed.data;

  if (hasDatabase()) {
    try {
      const db = getDb()!;
      await db.insert(listings).values({
        slug: `${slugify(d.name)}-${Date.now().toString(36)}`,
        name: d.name,
        typeSlug: d.typeSlug,
        tagline: d.tagline || null,
        description: d.description || null,
        website: d.website || null,
        phone: d.phone || null,
        email: d.email || null,
        status: 'pending_review',
        isOnlineOnly: d.isOnlineOnly,
        priceRange: d.priceRange || null,
        statementOfFaith: d.statementOfFaith || null,
        ownerId: locals.user?.id ?? null,
      });
    } catch (err) {
      console.error('[api/listings] insert failed:', err);
      return redirect(`/add-listing?error=${encodeURIComponent('Something went wrong saving your listing. Please try again.')}`, 303);
    }
  } else {
    console.log('[demo] listing submitted:', d.name, `by ${locals.user?.email ?? 'guest'}`);
  }
  return redirect('/add-listing?success=1', 303);
};
