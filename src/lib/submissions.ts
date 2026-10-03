/**
 * Business listing workflow (database-backed).
 * `saveListing` decides the status from the requested action: `publish` goes live
 * immediately, `submit`/`resubmit` enter moderation, `draft` stays private.
 * Owners manage and edit their own listings.
 */
import { and, eq, ilike, ne, sql, inArray } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  listings, listingLocations, listingIndustries, listingDenominations, listingHashtags,
  industries, industryCategories, denominations, hashtags, professions as professionRows, listingProfessions, listingServices,
} from '@/db/schema';
import type { SampleListing } from '@/data/listings';
import { slugify } from '@/lib/slug';
import { shouldMarkRecentlyUpdated } from '@/lib/recentlyUpdated.mjs';
import { isListingClaimable } from '@/lib/listingManagement.mjs';
import { validateTaxonomySelection, canonicalIndustrySlug, canonicalProfessionSlug, categoryBySlug, normalizeListingProfessions, allProfessions } from '@/data/industries';

export type ListingRow = typeof listings.$inferSelect;
export type PersistedListingStatus = ListingRow['status'];
export type ListingSaveAction = 'publish' | 'draft' | 'save' | 'submit' | 'resubmit';

/** Status policy shared by owner forms and API writes. Existing live listings stay live on ordinary saves. */
export function resolveListingStatus(
  action: ListingSaveAction | undefined,
  options: { listingId?: string; currentStatus?: PersistedListingStatus } = {},
): PersistedListingStatus {
  if (action === 'draft') return 'draft';
  if (options.listingId && options.currentStatus === 'published') return 'published';
  if (action === 'submit' || action === 'resubmit') return 'pending_review';
  if (action === 'save' && options.listingId) return options.currentStatus ?? 'published';
  return 'published';
}

export class TaxonomyCatalogUnavailableError extends Error {
  constructor(message = 'The taxonomy catalog is not ready yet. Please try again shortly.') {
    super(message);
    this.name = 'TaxonomyCatalogUnavailableError';
  }
}

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
  logoUrl?: string;
  coverUrl?: string;
  socialLinks?: Record<string, string>;
  photos?: Array<{ url: string; caption?: string; alt?: string }>;
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
  isHiring?: boolean;
  careersUrl?: string;
  priceRange?: string;
  industries?: string[];
  professions?: string[];
  customProfessions?: string[];
  services?: string[];
  denominations?: string[];
  hashtags?: string[];
  languages?: string[];
  accessibility?: string[];
  statementOfFaith?: string;
  coreBeliefs?: string[];
  worshipStyle?: string;
  baptismPractice?: string;
  communionPractice?: string;
  ministryFocus?: string[];
  holidayHours?: Record<string, string>;
  serviceAreaRadiusMi?: number;
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
    action?: ListingSaveAction;
    currentStatus?: PersistedListingStatus;
  } = {},
): Promise<{ id: string; slug: string; status: string; meaningfulUpdatePublished: boolean; recentlyUpdatedAt?: string }> {
  const db = getDb();
  if (!db) throw new Error('Database is not configured.');

  const status = resolveListingStatus(opts.action, opts);

  const taxonomyIssues = validateTaxonomySelection({ industrySlug: values.industrySlug, categorySlug: values.categorySlug, industries: values.industries ?? [], professions: values.professions ?? [], customProfessions: values.customProfessions ?? [], customCategory: values.customCategory, services: values.services ?? [] });
  if (taxonomyIssues.length) throw new Error(taxonomyIssues[0].message);
  const matchedCategory = values.categorySlug ? categoryBySlug(values.categorySlug) : undefined;
  const submittedIndustry = canonicalIndustrySlug(values.industrySlug) ?? values.industrySlug?.trim();
  // If a previously valid category moved, persist under its new canonical parent.
  const canonicalIndustry = matchedCategory?.industry.slug ?? submittedIndustry;
  const canonicalCategory = matchedCategory?.category.slug;
  const canonicalProfessions = normalizeListingProfessions(values.professions ?? []);
  const customProfessions = [...new Set((values.customProfessions ?? []).map((item) => item.trim().replace(/\s+/g, ' ')).filter(Boolean))].slice(0, 8);
  const serviceNames = [...new Set((values.services ?? []).map((item) => item.trim().replace(/\s+/g, ' ')).filter(Boolean))].slice(0, 30);
  const industrySlugs = [...new Set([
    ...(canonicalIndustry ? [canonicalIndustry] : []),
    ...(values.industries ?? []).map((slug) => canonicalIndustrySlug(slug)).filter((slug): slug is string => Boolean(slug)),
  ])];

  // Limit denominations to a maximum of 2 selections
  const cleanDenominations = (values.denominations ?? []).slice(0, 2);

  const base: Partial<typeof listings.$inferInsert> = {
    name: values.name.trim(),
    typeSlug: values.typeSlug,
    tagline: values.tagline?.trim() || null,
    description: values.description?.trim() || null,
    website: values.website?.trim() || null,
    logoUrl: values.logoUrl?.trim() || null,
    coverUrl: values.coverUrl?.trim() || null,
    socialLinks: values.socialLinks ?? {},
    photos: values.photos ?? [],
    phone: values.phone?.trim() || null,
    email: values.email?.trim() || null,
    showEmail: values.showEmail ?? false,
    showPhone: values.showPhone ?? false,
    showWebsite: values.showWebsite ?? false,
    showAddress: values.showAddress ?? false,
    showDenomination: values.showDenomination ?? true,
    customDenomination: values.customDenomination?.trim() || null,
    industrySlug: canonicalIndustry || null,
    categorySlug: canonicalCategory || values.categorySlug?.trim() || null,
    customProfessions,
    customCategory: values.customCategory?.trim() || null,
    denominationsList: cleanDenominations,
    isOnlineOnly: values.isOnlineOnly ?? false,
    priceRange: values.priceRange || null,
    statementOfFaith: values.statementOfFaith?.trim() || null,
    coreBeliefs: values.coreBeliefs ?? [],
    worshipStyle: values.worshipStyle?.trim() || null,
    baptismPractice: values.baptismPractice?.trim() || null,
    communionPractice: values.communionPractice?.trim() || null,
    ministryFocus: values.ministryFocus ?? [],
    holidayHours: values.holidayHours ?? {},
    languages: values.languages?.length ? values.languages : ['English'],
    status,
    updatedAt: new Date(),
  };
  // Preserve the original publication date during live edits; set/clear it only on transitions.
  if (!opts.listingId || opts.currentStatus !== 'published' || status !== 'published') {
    base.publishedAt = status === 'published' ? new Date() : null;
  }

  // Organization basics: only write when the payload actually carried the field,
  // so edits from forms that don't collect them (e.g. the dashboard) preserve existing values.
  if (values.yearFounded !== undefined) base.yearFounded = values.yearFounded || null;
  if (values.employeeCount !== undefined) base.employeeCount = values.employeeCount || null;
  if (values.ownershipType !== undefined) base.ownershipType = values.ownershipType || null;
  if (values.accessibility !== undefined) base.accessibility = values.accessibility;
  if (values.serviceArea !== undefined) base.serviceArea = values.serviceArea;
  if (values.serviceAreaRadiusMi !== undefined) base.serviceAreaRadiusMi = values.serviceAreaRadiusMi;
  if (values.hours !== undefined) base.hours = values.hours;
  if (values.contactPreference !== undefined) base.contactPreference = values.contactPreference || null;
  if (values.isHiring !== undefined) base.isHiring = values.isHiring;
  if (values.careersUrl !== undefined) base.careersUrl = values.careersUrl.trim() || null;

  const slug = opts.listingId ? undefined : await uniqueSlug(values.name);

  // Everything below is one unit of work: a failure between the child-table
  // deletes and re-inserts must never leave a listing without its location or taxonomy.
  return db.transaction(async (tx) => {
    // Verify the DB taxonomy catalog is seeded before any destructive relinking.
    const knownIndustryRows = industrySlugs.length
      ? await tx.select({ id: industries.id, slug: industries.slug }).from(industries).where(inArray(industries.slug, industrySlugs))
      : [];
    if (knownIndustryRows.length !== industrySlugs.length) throw new TaxonomyCatalogUnavailableError();
    const categoryRows = canonicalCategory
      ? await tx.select({ id: industryCategories.id, industryId: industryCategories.industryId }).from(industryCategories).where(eq(industryCategories.slug, canonicalCategory)).limit(1)
      : [];
    if (canonicalCategory && (!categoryRows[0] || (canonicalIndustry && categoryRows[0].industryId !== knownIndustryRows.find((row) => row.slug === canonicalIndustry)?.id))) {
      throw new TaxonomyCatalogUnavailableError();
    }
    const knownProfessionRows = canonicalProfessions.length
      ? await tx.select({ id: professionRows.id, slug: professionRows.slug, categoryId: professionRows.categoryId }).from(professionRows).where(inArray(professionRows.slug, canonicalProfessions))
      : [];
    if (knownProfessionRows.length !== canonicalProfessions.length || (categoryRows[0] && knownProfessionRows.some((row) => row.categoryId !== categoryRows[0].id))) {
      throw new TaxonomyCatalogUnavailableError();
    }

    let listingId = opts.listingId;
    let savedSlug: string;
    let meaningfulUpdatePublished = false;
    let resultingRecentlyUpdatedAt: Date | undefined;

    if (listingId) {
      const [currentRow] = await tx.select().from(listings).where(eq(listings.id, listingId)).limit(1);
      if (!currentRow) throw new Error('Listing not found.');
      const [currentLoc, currentServices, currentProfessions, currentIndustries, currentDenominations] = await Promise.all([
        tx.select({ city: listingLocations.city, region: listingLocations.region, postalCode: listingLocations.postalCode }).from(listingLocations).where(and(eq(listingLocations.listingId, listingId), eq(listingLocations.isPrimary, true))).limit(1),
        tx.select({ name: listingServices.name }).from(listingServices).where(eq(listingServices.listingId, listingId)),
        tx.select({ slug: professionRows.slug }).from(listingProfessions).innerJoin(professionRows, eq(listingProfessions.professionId, professionRows.id)).where(eq(listingProfessions.listingId, listingId)),
        tx.select({ slug: industries.slug }).from(listingIndustries).innerJoin(industries, eq(listingIndustries.industryId, industries.id)).where(eq(listingIndustries.listingId, listingId)),
        tx.select({ slug: denominations.slug }).from(listingDenominations).innerJoin(denominations, eq(listingDenominations.denominationId, denominations.id)).where(eq(listingDenominations.listingId, listingId)),
      ]);
      const oldIndustrySlugs = [...new Set([currentRow.industrySlug, ...currentIndustries.map((row) => row.slug)].filter((slug): slug is string => Boolean(slug)).map((slug) => canonicalIndustrySlug(slug) ?? slug))];
      const before = {
        name: currentRow.name, typeSlug: currentRow.typeSlug, tagline: currentRow.tagline, description: currentRow.description,
        industrySlug: canonicalIndustrySlug(currentRow.industrySlug ?? '') ?? currentRow.industrySlug,
        categorySlug: currentRow.categorySlug ? (categoryBySlug(currentRow.categorySlug)?.category.slug ?? currentRow.categorySlug) : null,
        customCategory: currentRow.customCategory, industries: oldIndustrySlugs,
        professions: currentProfessions.map((row) => canonicalProfessionSlug(row.slug) ?? row.slug),
        customProfessions: currentRow.customProfessions, services: currentServices.map((row) => row.name),
        hours: currentRow.hours, holidayHours: currentRow.holidayHours,
        priceRange: currentRow.priceRange, isHiring: currentRow.isHiring, careersUrl: currentRow.careersUrl,
        accessibility: currentRow.accessibility, languages: currentRow.languages,
        phone: currentRow.phone, email: currentRow.email, contactPreference: currentRow.contactPreference,
        showPhone: currentRow.showPhone, showEmail: currentRow.showEmail, showAddress: currentRow.showAddress, showDenomination: currentRow.showDenomination,
        website: currentRow.website, showWebsite: currentRow.showWebsite, socialLinks: currentRow.socialLinks,
        logoUrl: currentRow.logoUrl, coverUrl: currentRow.coverUrl, photos: currentRow.photos,
        city: currentLoc[0]?.city, region: currentLoc[0]?.region, postalCode: currentLoc[0]?.postalCode,
        isOnlineOnly: currentRow.isOnlineOnly, serviceArea: currentRow.serviceArea,
        serviceAreaRadiusMi: currentRow.serviceAreaRadiusMi,
        statementOfFaith: currentRow.statementOfFaith,
        denominations: currentRow.denominationsList?.length ? currentRow.denominationsList : currentDenominations.map((row) => row.slug),
        customDenomination: currentRow.customDenomination, coreBeliefs: currentRow.coreBeliefs,
        worshipStyle: currentRow.worshipStyle, baptismPractice: currentRow.baptismPractice,
        communionPractice: currentRow.communionPractice, ministryFocus: currentRow.ministryFocus,
        yearFounded: currentRow.yearFounded, employeeCount: currentRow.employeeCount,
        ownershipType: currentRow.ownershipType,
      };
      const keep = <T>(submitted: T | undefined, stored: T): T => submitted === undefined ? stored : submitted;
      const after = {
        name: values.name.trim(), typeSlug: values.typeSlug, tagline: keep(values.tagline, currentRow.tagline),
        description: keep(values.description, currentRow.description), industrySlug: canonicalIndustry,
        categorySlug: canonicalCategory ?? keep(values.categorySlug, currentRow.categorySlug),
        customCategory: keep(values.customCategory, currentRow.customCategory), industries: industrySlugs,
        professions: canonicalProfessions, customProfessions: keep(values.customProfessions, currentRow.customProfessions),
        services: serviceNames, hours: keep(values.hours, currentRow.hours),
        holidayHours: keep(values.holidayHours, currentRow.holidayHours),
        priceRange: keep(values.priceRange, currentRow.priceRange), isHiring: keep(values.isHiring, currentRow.isHiring),
        careersUrl: keep(values.careersUrl, currentRow.careersUrl), accessibility: keep(values.accessibility, currentRow.accessibility),
        phone: keep(values.phone, currentRow.phone),
        email: keep(values.email, currentRow.email), contactPreference: keep(values.contactPreference, currentRow.contactPreference),
        showPhone: keep(values.showPhone, currentRow.showPhone), showEmail: keep(values.showEmail, currentRow.showEmail),
        showAddress: keep(values.showAddress, currentRow.showAddress), showDenomination: keep(values.showDenomination, currentRow.showDenomination),
        website: keep(values.website, currentRow.website), showWebsite: keep(values.showWebsite, currentRow.showWebsite),
        socialLinks: keep(values.socialLinks, currentRow.socialLinks), logoUrl: keep(values.logoUrl, currentRow.logoUrl),
        coverUrl: keep(values.coverUrl, currentRow.coverUrl), photos: keep(values.photos, currentRow.photos), city: keep(values.city, currentLoc[0]?.city ?? null),
        region: keep(values.region, currentLoc[0]?.region ?? null), postalCode: keep(values.postalCode, currentLoc[0]?.postalCode ?? null),
        isOnlineOnly: keep(values.isOnlineOnly, currentRow.isOnlineOnly), serviceArea: keep(values.serviceArea, currentRow.serviceArea),
        serviceAreaRadiusMi: keep(values.serviceAreaRadiusMi, currentRow.serviceAreaRadiusMi),
        statementOfFaith: keep(values.statementOfFaith, currentRow.statementOfFaith), denominations: cleanDenominations,
        customDenomination: keep(values.customDenomination, currentRow.customDenomination),
        coreBeliefs: keep(values.coreBeliefs, currentRow.coreBeliefs), worshipStyle: keep(values.worshipStyle, currentRow.worshipStyle),
        baptismPractice: keep(values.baptismPractice, currentRow.baptismPractice),
        communionPractice: keep(values.communionPractice, currentRow.communionPractice),
        ministryFocus: keep(values.ministryFocus, currentRow.ministryFocus),
        yearFounded: keep(values.yearFounded, currentRow.yearFounded), employeeCount: keep(values.employeeCount, currentRow.employeeCount),
        ownershipType: keep(values.ownershipType, currentRow.ownershipType), languages: keep(values.languages, currentRow.languages),
      };
      meaningfulUpdatePublished = shouldMarkRecentlyUpdated({
        wasPublished: currentRow.status === 'published',
        willBePublished: status === 'published',
        before,
        after,
      });
      resultingRecentlyUpdatedAt = currentRow.recentlyUpdatedAt ?? undefined;
      if (meaningfulUpdatePublished) {
        resultingRecentlyUpdatedAt = new Date();
        base.recentlyUpdatedAt = resultingRecentlyUpdatedAt;
      }

      const patch: Partial<typeof listings.$inferInsert> = base;
      const [row] = await tx
        .update(listings)
        .set(patch)
        .where(eq(listings.id, listingId))
        .returning({ id: listings.id, slug: listings.slug });
      if (!row) throw new Error('Listing not found.');
      savedSlug = row.slug;
      await tx.delete(listingLocations).where(eq(listingLocations.listingId, listingId));
      await tx.delete(listingIndustries).where(eq(listingIndustries.listingId, listingId));
      await tx.delete(listingProfessions).where(eq(listingProfessions.listingId, listingId));
      await tx.delete(listingServices).where(eq(listingServices.listingId, listingId));
      await tx.delete(listingDenominations).where(eq(listingDenominations.listingId, listingId));
    } else {
      savedSlug = slug!;
      const insert: typeof listings.$inferInsert = {
        ...(base as typeof listings.$inferInsert),
        ownerId: userId || null,
        slug: savedSlug,
        status,
        name: values.name.trim(),
        typeSlug: values.typeSlug,
      };
      const [row] = await tx.insert(listings).values(insert).returning({ id: listings.id, slug: listings.slug });
      listingId = row.id;
    }

    if (values.city || values.region) {
      await tx.insert(listingLocations).values({
        listingId: listingId!,
        label: 'Primary',
        city: values.city || null,
        region: values.region || null,
        postalCode: values.postalCode || null,
        isPrimary: true,
      });
    }

    // Persist normalized primary/additional industries, professions, and selected/custom services.
    if (knownIndustryRows.length) await tx.insert(listingIndustries).values(knownIndustryRows.map((row) => ({ listingId: listingId!, industryId: row.id }))).onConflictDoNothing();
    if (knownProfessionRows.length) await tx.insert(listingProfessions).values(knownProfessionRows.map((row) => ({ listingId: listingId!, professionId: row.id }))).onConflictDoNothing();
    if (serviceNames.length) {
      const professionIds = new Map(knownProfessionRows.map((row) => [row.slug, row.id]));
      const serviceRows = serviceNames.map((name, sortOrder) => {
        const ownerProfession = allProfessions().find((profession) => canonicalProfessions.includes(profession.slug) && profession.services?.some((example) => example.toLocaleLowerCase('en-US') === name.toLocaleLowerCase('en-US')));
        return { listingId: listingId!, name, sortOrder, professionId: ownerProfession ? professionIds.get(ownerProfession.slug) ?? null : null };
      });
      await tx.insert(listingServices).values(serviceRows);
    }

    if (cleanDenominations.length) {
      const known = await tx.select({ id: denominations.id, slug: denominations.slug }).from(denominations).where(inArray(denominations.slug, cleanDenominations));
      if (known.length) {
        await tx.insert(listingDenominations).values(known.map((k) => ({ listingId: listingId!, denominationId: k.id })));
      }
    }

    // Hashtags: only touched when the payload carries them (a partial PATCH keeps the existing set).
    if (values.hashtags !== undefined) {
      const tags = [...new Set(values.hashtags.map(normalizeHashtag).filter(Boolean))].slice(0, 20);
      if (opts.listingId) await tx.delete(listingHashtags).where(eq(listingHashtags.listingId, listingId!));
      if (tags.length) {
        await tx.insert(hashtags).values(tags.map((tag) => ({ tag }))).onConflictDoNothing({ target: hashtags.tag });
        const rows = await tx.select({ id: hashtags.id }).from(hashtags).where(inArray(hashtags.tag, tags));
        if (rows.length) {
          await tx.insert(listingHashtags).values(rows.map((r) => ({ listingId: listingId!, hashtagId: r.id })));
        }
      }
    }

    return {
      id: listingId!, slug: savedSlug, status, meaningfulUpdatePublished,
      ...(resultingRecentlyUpdatedAt ? { recentlyUpdatedAt: resultingRecentlyUpdatedAt.toISOString() } : {}),
    };
  });
}

/** `#Faith-Based!` → `faith-based`; empty when nothing usable remains. */
export function normalizeHashtag(raw: string): string {
  return String(raw ?? '').trim().replace(/^#+/, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

/**
 * Stored row (+ primary location) → the form shape accepted by `saveListing`.
 * Used to merge a partial PATCH over the current values so fields the client
 * did not send are preserved instead of being reset to defaults.
 */
export function rowToFormValues(
  row: ListingRow,
  loc: { city: string | null; region: string | null; postalCode: string | null } | undefined,
  taxonomy: { professions?: string[]; services?: string[]; industries?: string[] } = {},
): ListingFormValues {
  return {
    name: row.name,
    typeSlug: row.typeSlug,
    tagline: row.tagline ?? undefined,
    description: row.description ?? undefined,
    website: row.website ?? undefined,
    logoUrl: row.logoUrl ?? undefined,
    coverUrl: row.coverUrl ?? undefined,
    socialLinks: row.socialLinks ?? {},
    photos: row.photos ?? [],
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    showEmail: row.showEmail,
    showPhone: row.showPhone,
    showWebsite: row.showWebsite,
    showAddress: row.showAddress,
    showDenomination: row.showDenomination,
    customDenomination: row.customDenomination ?? undefined,
    industrySlug: row.industrySlug ?? undefined,
    categorySlug: row.categorySlug ?? undefined,
    industries: taxonomy.industries !== undefined ? taxonomy.industries : (row.industrySlug ? [row.industrySlug] : []),
    professions: taxonomy.professions ?? [],
    customProfessions: row.customProfessions ?? [],
    services: taxonomy.services ?? [],
    customCategory: row.customCategory ?? undefined,
    city: loc?.city ?? undefined,
    region: loc?.region ?? undefined,
    postalCode: loc?.postalCode ?? undefined,
    isOnlineOnly: row.isOnlineOnly,
    isHiring: row.isHiring,
    careersUrl: row.careersUrl ?? undefined,
    priceRange: row.priceRange ?? undefined,
    statementOfFaith: row.statementOfFaith ?? undefined,
    coreBeliefs: row.coreBeliefs ?? [],
    worshipStyle: row.worshipStyle ?? undefined,
    baptismPractice: row.baptismPractice ?? undefined,
    communionPractice: row.communionPractice ?? undefined,
    ministryFocus: row.ministryFocus ?? [],
    denominations: row.denominationsList ?? [],
    languages: row.languages ?? undefined,
    accessibility: row.accessibility ?? undefined,
    yearFounded: row.yearFounded ?? undefined,
    employeeCount: row.employeeCount ?? undefined,
    ownershipType: row.ownershipType ?? undefined,
    serviceArea: row.serviceArea ?? undefined,
    serviceAreaRadiusMi: row.serviceAreaRadiusMi ?? undefined,
    hours: row.hours ?? undefined,
    holidayHours: row.holidayHours ?? undefined,
    contactPreference: row.contactPreference ?? undefined,
  };
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
  hashtagsList: string[] = [],
  taxonomy: { professions?: string[]; services?: string[]; industries?: string[] } = {},
): SampleListing {
  let hue = 0;
  for (const ch of row.slug) hue = (hue * 31 + ch.charCodeAt(0)) % 360;

  const denoms = (row.denominationsList && row.denominationsList.length > 0)
    ? row.denominationsList
    : denominationsList;
  const publishedTimestamp = row.publishedAt?.getTime?.() ?? row.createdAt?.getTime?.();
  const ageMs = typeof publishedTimestamp === 'number' ? Date.now() - publishedTimestamp : Number.NaN;
  const addedDaysAgo = Number.isFinite(ageMs) ? Math.max(0, Math.floor(ageMs / (24 * 60 * 60 * 1000))) : undefined;

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
    logoUrl: row.logoUrl ?? undefined,
    coverUrl: row.coverUrl ?? undefined,
    social: row.socialLinks ?? undefined,
    photos: (row.photos ?? []).map((photo, index) => ({ hue: (hue + index * 17) % 360, caption: photo.caption ?? `Photo ${index + 1}`, url: photo.url, alt: photo.alt ?? photo.caption ?? `Photo ${index + 1}` })),
    recentlyUpdatedAt: row.recentlyUpdatedAt?.toISOString?.(),
    showEmail: row.showEmail,
    showPhone: row.showPhone,
    showWebsite: row.showWebsite,
    showAddress: row.showAddress,
    showDenomination: row.showDenomination,
    customDenomination: row.showDenomination ? (row.customDenomination ?? undefined) : undefined,
    industrySlug: (row.industrySlug ? canonicalIndustrySlug(row.industrySlug) : undefined) ?? row.industrySlug ?? undefined,
    categorySlug: (row.categorySlug ? categoryBySlug(row.categorySlug)?.category.slug : undefined) ?? row.categorySlug ?? undefined,
    customCategory: row.customCategory ?? undefined,
    priceRange: row.priceRange ?? undefined,
    industries: [...new Set([row.industrySlug, ...(taxonomy.industries ?? [])].filter((slug): slug is string => Boolean(slug)).map((slug) => canonicalIndustrySlug(slug) ?? slug))],
    professions: [...new Set([...(taxonomy.professions ?? []).map((slug) => canonicalProfessionSlug(slug) ?? slug), ...(row.customProfessions ?? [])])],
    denominations: row.showDenomination ? denoms.slice(0, 2) : [],
    hashtags: hashtagsList,
    services: taxonomy.services ?? [],
    languages: row.languages ?? ['English'],
    accessibility: row.accessibility ?? [],
    badges: [],
    rating: Number(row.avgRating ?? 0),
    reviewCount: row.reviewCount,
    recommendations: row.recommendationCount,
    views: row.viewCount,
    verified: false,
    claimed: row.isClaimed,
    claimable: isListingClaimable(row),
    hours: row.hours ?? undefined,
    // Postgres column is jsonb string[]; expose a display string for the profile.
    serviceArea: (() => {
      const sa = row.serviceArea as unknown;
      if (typeof sa === 'string') return sa || undefined;
      if (Array.isArray(sa) && sa.length) return (sa as string[]).join('; ');
      return undefined;
    })(),
    statementOfFaith: row.statementOfFaith ?? undefined,
    isHiring: row.isHiring,
    careersUrl: row.careersUrl ?? undefined,
    addedDaysAgo,
    createdAt: row.createdAt?.toISOString?.(),
    publishedAt: row.publishedAt?.toISOString?.(),
    updatedAt: row.updatedAt?.toISOString?.(),
    imageHue: hue,
  };
}
