import type { APIRoute } from 'astro';
import { hasDatabase } from '@/db/client';
import { listingInputSchema } from '@/lib/validation';
import { saveListing } from '@/lib/submissions';

/** POST /api/listings — create a listing (published immediately). Supports form data and JSON. */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const isJson = request.headers.get('content-type')?.includes('application/json');

  if (isJson) {
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON payload.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const denoms = Array.isArray(body.denominations) ? (body.denominations as string[]) : [];
    if (denoms.length > 2) {
      return new Response(JSON.stringify({ ok: false, error: 'You can select up to two denominations.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const parsed = listingInputSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid listing data.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    let createdSlug = '';
    if (hasDatabase()) {
      try {
        const ownerId = locals.user?.id ?? null;
        const result = await saveListing(ownerId, parsed.data, { action: 'publish' });
        createdSlug = result.slug;
      } catch (err) {
        console.error('[api/listings] json insert failed:', err);
        return new Response(JSON.stringify({ ok: false, error: 'Could not save listing.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, slug: createdSlug }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Form data path
  const form = await request.formData();
  const get = (k: string) => String(form.get(k) ?? '').trim();

  // Multi-denomination: extract all values
  const rawDenoms = form.getAll('denominations')
    .flatMap((v) => String(v).split(','))
    .map((s) => s.trim())
    .filter(Boolean);
  const denoms = [...new Set(rawDenoms)];

  if (denoms.length > 2) {
    return redirect(`/add-listing?error=${encodeURIComponent('You can select up to two denominations.')}`, 303);
  }

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
    industrySlug: get('industrySlug') || undefined,
    categorySlug: get('categorySlug') || undefined,
    customCategory: get('customCategory') || undefined,
    city: get('city'),
    region: get('region'),
    postalCode: get('postalCode'),
    isOnlineOnly: form.get('isOnlineOnly') === '1',
    priceRange: get('priceRange'),
    statementOfFaith: get('statementOfFaith'),
    industries: get('industrySlug') ? [get('industrySlug')] : (get('industries') ? [get('industries')] : []),
    denominations: denoms,
    hashtags: get('hashtags') ? get('hashtags').split(',').map((s) => s.trim().replace(/^#/, '')).filter(Boolean) : [],
  });

  if (!parsed.success) {
    return redirect(`/add-listing?error=${encodeURIComponent(parsed.error.errors[0]?.message ?? 'Please check your entries.')}`, 303);
  }
  const d = parsed.data;

  let createdSlug = '';
  if (hasDatabase()) {
    try {
      const ownerId = locals.user?.id ?? null;
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
