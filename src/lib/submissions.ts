/**
 * Business listing workflow (database-backed).
 * Listings are published immediately upon creation.
 * Owners manage and edit their own listings.
 */
import { and, eq, ilike, ne, sql, inArray } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { listings, listingLocations, listingIndustries, listingDenominations, industries, denominations } from '@/db/schema';
import type { SampleListing } from '@/data/listings';
import { slugify } from '@/lib/slug';

export type ListingRow = typeof listings.$inferSelect;

export async function duplicateExists(ownerId: string, name: string, city?: string | null, excludeId?: string): Promise<boolean> {
  if (!city || !name) return false;
  const db = getDb();
  if (!db) return false;
  const conds = [
    eq(listings.ownerId, ownerId),
    sql`lower(${listings.name}) = ${name.toLowerCase().trim()}`,
    sql`exists (select 1 from ${listingLocations} loc where loc.listing_id = ${listings.id} and lower(loc.city) = ${city.toLowerCase().trim()})`,
    sql`${listings.deletedAt} is null`,
    ne(listings.status, 'archived' as const),
  ];
  if (excludeId) conds.push(ne(listings.id, excludeId));
  const rows = await db.select({ id: listings.id }).from(listings).where(and(...conds)).limit(1);
  return rows.length > 0;
}

export async function uniqueSlug(name: string): Promise<string> {
  const db = getDb();
  const base = slugify(name).slice(0, 200) || 'listing';
  if (!db) return `${base}-${Math.random().toString(36).slice(2, 8)}`;
  const existing = await db.select({ slug: listings.slug }).from(listings).where(ilike(listings.slug, `${base}%`));
  if (!existing.some((e) => e.slug === base)) return base;
  for (let i = 0; i < 8; i++) {
    const candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    if (!existing.some((e) => e.slug === candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export interface ListingFormValues {
  name: string;
  typeSlug: string;
  tagline?: string;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
  showEmail?: boolean;
  showPhone?: boolean;
  showWebsite?: boolean;
  showAddress?: boolean;
  showDenomination?: boolean;
  customDenomination?: string;
  industrySlug?: string;
  categorySlug?: string;
  customCategory?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  isOnlineOnly?: boolean;
  priceRange?: string;
  industries?: string[];
  professions?: string[];
  denominations?: string[];
  hashtags?: string[];
  languages?: string[];
  accessibility?: string[];
  statementOfFaith?: string;
  /** Organization basics (all optional; undefined = not collected by this payload). */
  yearFounded?: number;
  employeeCount?: string;
  ownershipType?: string;
  serviceArea?: string[];
  hours?: Record<string, string>;
  contactPreference?: string;
}

/** Creates or updates the listing row plus its primary location and taxonomy links. */
export async function saveListing(
  userId: string | null | undefined,
  values: ListingFormValues,
  opts: {
    listingId?: string;
    action?: 'publish' | 'draft' | 'save' | 'submit' | 'resubmit';
    currentStatus?: typeof listings.$inferInsert['status'];
  } = {},
): Promise<{ id: string; slug: string; status: string }> {
  const db = getDb();
  if (!db) throw new Error('Database is not configured.');

  // Unless explicitly saved as a draft or submitted for review, all created/edited listings are published immediately
  const status = opts.action === 'draft' ? (opts.currentStatus ?? 'draft')
    : ((opts.action === 'submit' || opts.action === 'resubmit') ? 'pending_review' : 'published');

  // Limit denominations to a maximum of 2 selections
  const cleanDenominations = (values.denominations ?? []).slice(0, 2);

  const base: Partial<typeof listings.$inferInsert> = {
    name: values.name.trim(),
    typeSlug: values.typeSlug,
    tagline: values.tagline?.trim() || null,
    description: values.description?.trim() || null,
    website: values.website || null,
    phone: values.phone?.trim() || null,
    email: values.email?.trim() || null,
    showEmail: values.showEmail ?? false,
    showPhone: values.showPhone ?? false,
    showWebsite: values.showWebsite ?? false,
    showAddress: values.showAddress ?? false,
    showDenomination: values.showDenomination ?? true,
    customDenomination: values.customDenomination?.trim() || null,
    industrySlug: values.industrySlug?.trim() || null,
    categorySlug: values.categorySlug?.trim() || null,
    customCategory: values.customCategory?.trim() || null,
    denominationsList: cleanDenominations,
    isOnlineOnly: values.isOnlineOnly ?? false,
    priceRange: values.priceRange || null,
    statementOfFaith: values.statementOfFaith?.trim() || null,
    languages: values.languages?.length ? values.languages : ['English'],
    status,
    publishedAt: status === 'published' ? new Date() : null,
    updatedAt: new Date(),
  };

  // Organization basics: only write when the payload actually carried the field,
  // so edits from forms that don't collect them (e.g. the dashboard) preserve existing values.
  if (values.yearFounded !== undefined) base.yearFounded = values.yearFounded || null;
  if (values.employeeCount !== undefined) base.employeeCount = values.employeeCount || null;
  if (values.ownershipType !== undefined) base.ownershipType = values.ownershipType || null;
  if (values.serviceArea !== undefined) base.serviceArea = values.serviceArea;
  if (values.hours !== undefined) base.hours = values.hours;
  if (values.contactPreference !== undefined) base.contactPreference = values.contactPreference || null;

  let listingId = opts.listingId;
  let slug: string;

  if (listingId) {
    const patch: Partial<typeof listings.$inferInsert> = base;
    const [row] = await db
      .update(listings)
      .set(patch)
      .where(eq(listings.id, listingId))
      .returning({ id: listings.id, slug: listings.slug });
    if (!row) throw new Error('Listing not found.');
    slug = row.slug;
    await db.delete(listingLocations).where(eq(listingLocations.listingId, listingId));
    await db.delete(listingIndustries).where(eq(listingIndustries.listingId, listingId));
    await db.delete(listingDenominations).where(eq(listingDenominations.listingId, listingId));
  } else {
    slug = await uniqueSlug(values.name);
    const insert: typeof listings.$inferInsert = {
      ...(base as typeof listings.$inferInsert),
      ownerId: userId || null,
      slug,
      status,
      name: values.name.trim(),
      typeSlug: values.typeSlug,
    };
    const [row] = await db.insert(listings).values(insert).returning({ id: listings.id, slug: listings.slug });
    listingId = row.id;
  }

  if (values.city || values.region) {
    await db.insert(listingLocations).values({
      listingId: listingId!,
      label: 'Primary',
      city: values.city || null,
      region: values.region || null,
      postalCode: values.postalCode || null,
      isPrimary: true,
    });
  }

  // Taxonomy child tables key on seeded UUIDs — resolve slugs, ignore unknowns.
  const industrySlugs = [
    ...new Set([
      ...(values.industrySlug ? [values.industrySlug] : []),
      ...(values.categorySlug ? [values.categorySlug] : []),
      ...(values.industries ?? []),
      ...(values.professions ?? []),
    ]),
  ].slice(0, 12);

  if (industrySlugs.length) {
    const known = await db.select({ id: industries.id, slug: industries.slug }).from(industries).where(inArray(industries.slug, industrySlugs));
    if (known.length) {
      await db.insert(listingIndustries).values(known.map((k) => ({ listingId: listingId!, industryId: k.id })));
    }
  }

  if (cleanDenominations.length) {
    const known = await db.select({ id: denominations.id, slug: denominations.slug }).from(denominations).where(inArray(denominations.slug, cleanDenominations));
    if (known.length) {
      await db.insert(listingDenominations).values(known.map((k) => ({ listingId: listingId!, denominationId: k.id })));
    }
  }

  return { id: listingId!, slug, status };
}

/** Owner-visible status list. */
export const OWNER_STATUSES = ['published', 'draft', 'archived'] as const;
export type OwnerStatus = (typeof OWNER_STATUSES)[number];

export const STATUS_LABEL: Record<string, string> = {
  published: 'Approved',
  draft: 'Draft',
  pending_review: 'Pending Review',
  suspended: 'Suspended',
  archived: 'Archived',
  rejected: 'Rejected',
  changes_requested: 'Changes Requested',
};

export const STATUS_CHIP: Record<string, string> = {
  published: 'badge-verify',
  draft: '',
  pending_review: 'badge-verify',
  suspended: 'chip',
  archived: 'chip',
  rejected: 'chip',
  changes_requested: 'chip-active',
};

/** DB listing row (+primary location) → the SampleListing shape the UI renders. */
export function mapListingRow(
  row: ListingRow,
  loc: { city: string | null; region: string | null; postalCode: string | null; latitude: string | null; longitude: string | null } | undefined,
  denominationsList: string[] = [],
): SampleListing {
  let hue = 0;
  for (const ch of row.slug) hue = (hue * 31 + ch.charCodeAt(0)) % 360;

  const denoms = (row.denominationsList && row.denominationsList.length > 0)
    ? row.denominationsList
    : denominationsList;

  return {
    id: `db-${row.id}`,
    slug: row.slug,
    name: row.name,
    typeSlug: row.typeSlug,
    tagline: row.tagline ?? 'Christian-owned business in the CrossLinkd directory.',
    description: row.description ?? '',
    city: loc?.city ?? '—',
    region: loc?.region ?? '—',
    // Only expose postal code if showAddress is enabled
    postalCode: row.showAddress ? (loc?.postalCode ?? undefined) : undefined,
    lat: loc?.latitude ? Number(loc.latitude) : undefined,
    lng: loc?.longitude ? Number(loc.longitude) : undefined,
    isOnlineOnly: row.isOnlineOnly,
    // Strictly respect privacy settings for public display
    phone: row.showPhone ? (row.phone ?? undefined) : undefined,
    email: row.showEmail ? (row.email ?? undefined) : undefined,
    website: row.showWebsite ? (row.website ?? undefined) : undefined,
    showEmail: row.showEmail,
    showPhone: row.showPhone,
    showWebsite: row.showWebsite,
    showAddress: row.showAddress,
    showDenomination: row.showDenomination,
    customDenomination: row.showDenomination ? (row.customDenomination ?? undefined) : undefined,
    industrySlug: row.industrySlug ?? undefined,
    categorySlug: row.categorySlug ?? undefined,
    customCategory: row.customCategory ?? undefined,
    priceRange: row.priceRange ?? undefined,
    industries: row.industrySlug ? [row.industrySlug] : [],
    professions: row.categorySlug ? [row.categorySlug] : [],
    denominations: row.showDenomination ? denoms.slice(0, 2) : [],
    hashtags: [],
    services: [],
    languages: row.languages ?? ['English'],
    accessibility: row.accessibility ?? [],
    badges: [],
    rating: Number(row.avgRating ?? 0),
    reviewCount: row.reviewCount,
    recommendations: row.recommendationCount,
    views: row.viewCount,
    verified: false,
    claimed: row.isClaimed,
    hours: row.hours ?? undefined,
    // Postgres column is jsonb string[]; expose a display string for the profile.
    serviceArea: (() => {
      const sa = row.serviceArea as unknown;
      if (typeof sa === 'string') return sa || undefined;
      if (Array.isArray(sa) && sa.length) return (sa as string[]).join('; ');
      return undefined;
    })(),
    statementOfFaith: row.statementOfFaith ?? undefined,
    addedDaysAgo: 0,
    imageHue: hue,
  };
}
