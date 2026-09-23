import type { APIRoute } from 'astro';
import { hasDatabase } from '@/db/client';
import { listingInputSchema } from '@/lib/validation';
import { saveListing } from '@/lib/submissions';

/** POST /api/listings — create a listing (published immediately). */
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
    showEmail: form.get('showEmail') === '1',
    showPhone: form.get('showPhone') === '1',
    showWebsite: form.get('showWebsite') === '1',
    showAddress: form.get('showAddress') === '1',
    showDenomination: form.get('showDenomination') === '1',
    customDenomination: get('customDenomination') || undefined,
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

  let createdSlug = '';
  if (hasDatabase()) {
    try {
      const ownerId = locals.user?.id ?? '00000000-0000-0000-0000-000000000000';
      const result = await saveListing(ownerId, d, { action: 'publish' });
      createdSlug = result.slug;
    } catch (err) {
      console.error('[api/listings] insert failed:', err);
      return redirect(`/add-listing?error=${encodeURIComponent('Something went wrong saving your listing. Please try again.')}`, 303);
    }
  } else {
    console.log('[demo] listing published:', d.name, `by ${locals.user?.email ?? 'guest'}`);
  }

  return redirect(`/add-listing?success=1${createdSlug ? `&slug=${encodeURIComponent(createdSlug)}` : ''}`, 303);
};
