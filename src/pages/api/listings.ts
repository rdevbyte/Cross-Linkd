import type { APIRoute } from 'astro';
import { hasDatabase } from '@/db/client';
import { listingInputSchema } from '@/lib/validation';
import { duplicateExists, saveListing, TaxonomyCatalogUnavailableError } from '@/lib/submissions';
import { honeypotTripped, listingSpamReason, publishBlockReason } from '@/lib/formGuards.mjs';
import { sharedRateLimit } from '@/lib/sharedRateLimit';

function clientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

async function listingGate(
  request: Request,
  user: { id?: string } | null | undefined,
  data: { email?: string | null; city?: string | null; region?: string | null; isOnlineOnly?: boolean; name?: string | null; description?: string | null; tagline?: string | null; denominations?: string[]; customDenomination?: string | null; statementOfFaith?: string | null },
  attestation: unknown,
  terms: unknown,
  honeypot: unknown,
) {
  if (honeypotTripped(honeypot)) return { status: 400, message: 'Please check your entries and try again.' };
  const key = user?.id ? `publish:user:${user.id}` : `publish:ip:${clientIp(request)}`;
  if (!(await sharedRateLimit(key, user?.id ? 30 : 3, 60 * 60 * 1000))) {
    return { status: 429, message: 'Too many listing submissions from this network. Wait an hour and try again.' };
  }
  const spam = listingSpamReason(`${data.name ?? ''} ${data.tagline ?? ''} ${data.description ?? ''}`);
  if (spam) return { status: 400, message: spam };
  const message = publishBlockReason({
    user,
    email: data.email,
    city: data.city,
    region: data.region,
    isOnlineOnly: data.isOnlineOnly,
    denominations: data.denominations,
    customDenomination: data.customDenomination,
    statementOfFaith: data.statementOfFaith,
    attestation,
    terms,
  });
  return message ? { status: 400, message } : null;
}

/**
 * POST /api/listings — create a listing from the public form. Supports form data and JSON.
 * Signed-in owners publish immediately (they are accountable and per-user throttled).
 * Guest submissions are accepted but enter the moderation queue (`pending_review`)
 * so anonymous content is never live before a person has looked at it.
 */
const creationAction = (user: { id?: string } | null | undefined): 'publish' | 'submit' => (user?.id ? 'publish' : 'submit');

/**
 * Same owner-scoped duplicate rule as /api/submissions and PATCH /api/listings/[id]:
 * one listing per (owner, name, city). Guests have no owner to scope by, so their
 * repeats are left to moderation.
 */
const DUPLICATE_MESSAGE = 'You already have a listing with this name in this city.';
async function ownerDuplicate(user: { id?: string } | null | undefined, name: string, city?: string | null) {
  if (!user?.id || !hasDatabase()) return false;
  return duplicateExists(user.id, name, city);
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!hasDatabase()) {
    const message = 'Listings cannot be saved while the database is unavailable. Please try again later.';
    if (request.headers.get('content-type')?.includes('application/json')) {
      return new Response(JSON.stringify({ ok: false, error: message }), { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    return redirect(`/add-listing?error=${encodeURIComponent(message)}`, 303);
  }
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
    const jsonGate = await listingGate(request, locals.user, parsed.data, body.attestation, body.terms, body.hp_company);
    if (jsonGate) {
      return new Response(JSON.stringify({ ok: false, error: jsonGate.message }), {
        status: jsonGate.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let createdSlug = '';
    let status = '';
    if (hasDatabase()) {
      try {
        if (await ownerDuplicate(locals.user, parsed.data.name, parsed.data.city)) {
          return new Response(JSON.stringify({ ok: false, error: DUPLICATE_MESSAGE }), {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        const ownerId = locals.user?.id ?? null;
        const result = await saveListing(ownerId, parsed.data, { action: creationAction(locals.user) });
        createdSlug = result.slug;
        status = result.status;
      } catch (err) {
        console.error('[api/listings] json insert failed', err instanceof Error ? err.name : 'error');
        const catalogError = err instanceof TaxonomyCatalogUnavailableError;
        return new Response(JSON.stringify({ ok: false, error: catalogError ? err.message : 'Could not save listing.' }), {
          status: catalogError ? 503 : 500,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, slug: createdSlug, status }), {
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
    yearFounded: get('yearFounded') || undefined,
    employeeCount: get('employeeCount') || undefined,
    ownershipType: get('ownershipType') || undefined,
    serviceArea: get('serviceArea') ?? undefined,
    hours: get('hours') ?? undefined,
    contactPreference: get('contactPreference') || undefined,
    customDenomination: get('customDenomination') || undefined,
    industrySlug: get('industrySlug') || undefined,
    categorySlug: get('categorySlug') || undefined,
    customCategory: get('customCategory') || undefined,
    city: get('city'),
    region: get('region'),
    postalCode: get('postalCode'),
    isOnlineOnly: form.get('isOnlineOnly') === '1',
    isHiring: form.get('isHiring') === '1',
    careersUrl: get('careersUrl'),
    priceRange: get('priceRange'),
    statementOfFaith: get('statementOfFaith'),
    industries: get('industrySlug') ? [get('industrySlug')] : (get('industries') ? [get('industries')] : []),
    professions: form.getAll('professions').map((value) => String(value).trim()).filter(Boolean),
    customProfessions: get('customProfessions').split(/[\n;,]+/).map((value) => value.trim()).filter(Boolean),
    services: [...form.getAll('services').map((value) => String(value).trim()), ...get('customServices').split(/[\n;,]+/).map((value) => value.trim())].filter(Boolean),
    denominations: denoms,
    hashtags: get('hashtags') ? get('hashtags').split(',').map((s) => s.trim().replace(/^#/, '')).filter(Boolean) : [],
  });

  if (!parsed.success) {
    return redirect(`/add-listing?error=${encodeURIComponent(parsed.error.errors[0]?.message ?? 'Please check your entries.')}`, 303);
  }
  const d = parsed.data;
  const formGate = await listingGate(request, locals.user, d, form.get('attestation'), form.get('terms'), form.get('hp_company'));
  if (formGate) return redirect(`/add-listing?error=${encodeURIComponent(formGate.message)}`, 303);

  let createdSlug = '';
  let status = '';
  if (hasDatabase()) {
    try {
      if (await ownerDuplicate(locals.user, d.name, d.city)) {
        return redirect(`/add-listing?error=${encodeURIComponent(DUPLICATE_MESSAGE)}`, 303);
      }
      const ownerId = locals.user?.id ?? null;
      const result = await saveListing(ownerId, d, { action: creationAction(locals.user) });
      createdSlug = result.slug;
      status = result.status;
    } catch (err) {
      console.error('[api/listings] insert failed:', err instanceof Error ? err.name : 'error');
      const message = err instanceof TaxonomyCatalogUnavailableError ? err.message : 'Something went wrong saving your listing. Please try again.';
      return redirect(`/add-listing?error=${encodeURIComponent(message)}`, 303);
    }
  }

  const params = new URLSearchParams({ success: '1' });
  if (createdSlug) params.set('slug', createdSlug);
  if (status) params.set('status', status);
  return redirect(`/add-listing?${params.toString()}`, 303);
};
