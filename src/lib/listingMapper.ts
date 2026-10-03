/**
 * DB listing row (+ primary location) → the `SampleListing` shape the UI renders.
 * Pure (no database access), so the public-listing cache and the submission workflow can
 * both depend on it without importing each other.
 */
import type { listings } from '@/db/schema';
import type { SampleListing } from '@/data/listings';

export type ListingRow = typeof listings.$inferSelect;

/** DB listing row (+primary location) → the SampleListing shape the UI renders. */
export function mapListingRow(
  row: ListingRow,
  loc: { city: string | null; region: string | null; postalCode: string | null; latitude: string | null; longitude: string | null } | undefined,
  denominationsList: string[] = [],
  hashtagsList: string[] = [],
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
    hashtags: hashtagsList,
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
    isHiring: row.isHiring,
    careersUrl: row.careersUrl ?? undefined,
    // Days since it went live (publishedAt, else creation) so "newest" sorting, the
    // "added …" text and the home page's latest list reflect reality. This was hard-coded
    // to 0, which made every database listing look like it had just been added.
    addedDaysAgo: (() => {
      const since = row.publishedAt ?? row.createdAt;
      return since ? Math.max(0, Math.floor((Date.now() - since.getTime()) / 86_400_000)) : 0;
    })(),
    imageHue: hue,
  };
}
