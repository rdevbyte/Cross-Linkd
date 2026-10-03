/**
 * Search engine — parses natural language + hashtags, applies filters,
 * scores relevance, sorts, and paginates.
 *
 * Production paths use src/lib/dbSearch.ts so filtering, counting, sorting,
 * and pagination happen in Postgres before page-only hydration. This in-memory
 * engine remains for explicitly supplied data and unit tests.
 */
import type { SampleListing } from '@/data/listings';
import { DENOMINATIONS } from '@/data/denominations';
import { taxonomyTermsForSlug, listingMatchesIndustry, categoryBySlug, canonicalProfessionSlug } from '@/data/industries';
import { FOCUS_CITIES, resolveLocation } from '@/data/locations';
import { parseQuery } from './hashtags';
import { distanceMi, geocodeCity } from './geo';
import type { SearchFilters } from './validation';
import { recentlyUpdatedState } from '@/lib/recentlyUpdated.mjs';

export interface SearchHit extends SampleListing {
  distanceMiles?: number;
  score: number;
  matchedTags: string[];
}

/** Actionable "no results" suggestion linking to a real, populated page. */
export interface AltLink { label: string; href: string }

export interface SearchResult {
  hits: SearchHit[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  suggestions: string[];
  appliedTags: string[];
  altLinks: AltLink[];
}

const SYNONYMS: Record<string, string[]> = {
  bakery: ['bakery', 'cakes', 'bread', 'pastries', 'baker'],
  counselor: ['counselor', 'counseling', 'therapist', 'therapy', 'pastoral'],
  plumber: ['plumber', 'plumbing'],
  accountant: ['accountant', 'accounting', 'bookkeeper', 'bookkeeping', 'cpa', 'tax'],
  electrician: ['electrician', 'electrical'],
  contractor: ['contractor', 'remodeling', 'remodel', 'builder'],
  church: ['church', 'congregation', 'parish', 'fellowship', 'worship'],
  photographer: ['photographer', 'photography', 'portraits'],
  lawyer: ['attorney', 'lawyer', 'legal'],
  realtor: ['realtor', 'real estate', 'realty'],
  auto: ['auto', 'mechanic', 'car repair'],
  school: ['school', 'academy', 'education'],
  catholic: ['catholic', 'roman catholic', 'parish', 'mass'],
  baptist: ['baptist', 'sbc'],
  pentecostal: ['pentecostal', 'assemblies of god', 'charismatic'],
};

function expandTerms(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  for (const w of words) {
    out.add(w);
    for (const [key, syns] of Object.entries(SYNONYMS)) {
      if (w === key || syns.includes(w)) syns.forEach((s) => out.add(s));
    }
  }
  return [...out];
}

function haystack(l: SampleListing): string {
  return [
    l.name, l.tagline, l.description, l.city, l.region,
    l.industrySlug ?? '', l.categorySlug ?? '', l.customCategory ?? '',
    ...l.services, ...l.hashtags, ...l.industries, ...l.professions, ...l.denominations,
    ...[l.industrySlug, l.categorySlug, ...l.industries, ...l.professions].filter(Boolean).flatMap((slug) => taxonomyTermsForSlug(String(slug))),
  ].join(' ').toLowerCase();
}

function tagMatchesListing(tag: string, l: SampleListing): boolean {
  const t = tag.toLowerCase().replace(/-/g, '');
  const pools = [
    ...l.hashtags.map((h) => h.toLowerCase().replace(/-/g, '')),
    ...l.denominations.map((d) => d.toLowerCase().replace(/-/g, '')),
    ...l.industries.map((d) => d.toLowerCase().replace(/-/g, '')),
    ...l.professions.map((d) => d.toLowerCase().replace(/-/g, '')),
    l.typeSlug.toLowerCase().replace(/-/g, ''),
    l.city.toLowerCase().replace(/\s/g, ''),
    ...(l.verified ? ['verified'] : []),
    ...(l.claimed ? ['claimed'] : []),
  ];
  // denomination aliases
  for (const d of DENOMINATIONS) {
    const names = [d.name, d.slug, ...d.aliases, ...d.searchTerms].map((s) => s.toLowerCase().replace(/[^a-z]/g, ''));
    if (names.includes(t)) {
      const lTags = l.denominations.map((x) => x.toLowerCase());
      if (lTags.includes(d.slug)) return true;
    }
  }
  return pools.some((p) => p === t || p.includes(t) || t.includes(p));
}

/** Hierarchical filter matching uses the shared taxonomy/alias resolver. */
function listingInIndustry(l: SampleListing, industrySlug: string): boolean {
  return listingMatchesIndustry(l, industrySlug);
}

function listingInCategory(l: SampleListing, catSlug: string): boolean {
  const target = categoryBySlug(catSlug);
  if (!target) return false;
  const listingCategory = l.categorySlug ? categoryBySlug(l.categorySlug) : undefined;
  if (listingCategory?.category.slug === target.category.slug) return true;
  if (l.industries.some((slug) => categoryBySlug(slug)?.category.slug === target.category.slug)) return true;
  if (l.professions.length === 0) return false;
  return l.professions.some((slug) => {
    const canonical = canonicalProfessionSlug(slug);
    return target.category.professions.some((profession) => profession.slug === canonical);
  });
}

export function searchListings(rawFilters: Partial<SearchFilters> & { q?: string; near?: string }, extra: SampleListing[] = []): SearchResult {
  const q = rawFilters.q ?? '';
  const { text, tags } = parseQuery(q);
  const terms = expandTerms(text);

  // Mutable filter set — the "near" field may add city/region constraints.
  const filters: Partial<SearchFilters> & { q?: string; near?: string } = { ...rawFilters };
  const nearRaw = (rawFilters.near ?? '').trim();
  let nearText = '';
  if (/^(online|online only|online-only)$/i.test(nearRaw)) {
    filters.onlineOnly = true;
  } else {
    const loc = resolveLocation(nearRaw || undefined);
    if (loc?.city) {
      filters.city = loc.city.city;
      filters.region = loc.city.region;
      if (rawFilters.radiusMi === undefined) filters.radiusMi = 25;
    } else if (loc?.state) {
      filters.region = loc.state.abbr;
    } else if (nearRaw) {
      // Match published places the focus-city list does not know, including
      // locations outside the United States. Do not treat an unknown place as "show everything."
      nearText = nearRaw.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    }
  }

  let pool: SearchHit[] = extra.map((l) => ({ ...l, score: 0, matchedTags: [] as string[] }));

  // --- tag filtering (AND semantics) ---
  if (tags.length) {
    pool = pool.filter((l) => {
      const matched = tags.filter((t) => tagMatchesListing(t, l));
      l.matchedTags = matched;
      return matched.length === tags.length;
    });
  }

  // --- text relevance ---
  if (terms.length) {
    pool = pool
      .map((l) => {
        const hay = haystack(l);
        let score = 0;
        for (const term of terms) {
          if (l.name.toLowerCase().includes(term)) score += 12;
          else if (l.tagline.toLowerCase().includes(term)) score += 6;
          else if (l.services.some((s) => s.toLowerCase().includes(term))) score += 5;
          else if (hay.includes(term)) score += 2;
        }
        // natural-language helpers
        if (/spanish/.test(text.toLowerCase()) && l.languages.includes('Spanish')) score += 8;
        if (/wheelchair|accessible|access/.test(text.toLowerCase()) && l.accessibility.some((a) => /wheelchair/i.test(a))) score += 8;
        if (/financ/.test(text.toLowerCase()) && l.hashtags.includes('FinancingAvailable')) score += 8;
        if (/near me/.test(q.toLowerCase())) score += 1;
        return { ...l, score };
      })
      .filter((l) => l.score > 0 || tags.length > 0);
  }

  // --- structured filters ---
  const f = filters;
  if (f.type?.length) pool = pool.filter((l) => f.type!.includes(l.typeSlug));
  if (f.denomination?.length) pool = pool.filter((l) => l.denominations.some((d) => f.denomination!.includes(d)));
  if (f.industry?.length) pool = pool.filter((l) => f.industry!.some((d) => listingInIndustry(l, d)));
  if (f.profession?.length) pool = pool.filter((l) => l.professions.some((d) => f.profession!.some((value) => canonicalProfessionSlug(value) === canonicalProfessionSlug(d))));
  if (f.category?.length) pool = pool.filter((l) => f.category!.some((c) => listingInCategory(l, c)));
  if (f.service?.length) pool = pool.filter((l) => f.service!.every((query) => l.services.some((service) => service.toLocaleLowerCase('en-US').includes(query.toLocaleLowerCase('en-US')))));
  if (f.city) pool = pool.filter((l) => l.city.toLowerCase().includes(f.city!.toLowerCase()));
  if (f.region) pool = pool.filter((l) => l.region.toLowerCase() === f.region!.toLowerCase());
  if (f.postal) pool = pool.filter((l) => (l.postalCode ?? '').toLowerCase().includes(f.postal!.toLowerCase()));
  if (f.verifiedOnly) pool = pool.filter((l) => l.verified);
  if (f.onlineOnly) pool = pool.filter((l) => l.isOnlineOnly || l.hashtags.includes('OnlineServices'));
  if (f.openNow) pool = pool.filter((l) => Object.values(l.hours ?? {}).some((hours) => /24[ -]?hours?|24h/i.test(hours)));
  if (f.minRating) pool = pool.filter((l) => l.rating >= f.minRating!);
  if (f.price?.length) pool = pool.filter((l) => l.priceRange && f.price!.includes(l.priceRange));
  if (f.languages?.length) pool = pool.filter((l) => f.languages!.every((x) => l.languages.includes(x)));
  if (nearText) {
    const tokens = nearText.split(' ').filter((t) => t.length > 1);
    pool = pool.filter((l) => {
      const blob = [l.city, l.region, l.country, l.postalCode]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ');
      return tokens.every((t) => blob.includes(t));
    });
  }
  if (f.accessibility?.length) pool = pool.filter((l) => f.accessibility!.every((x) =>
    l.accessibility.some((a) => a.toLowerCase().includes(x.toLowerCase()))));

  // --- geo ---
  let origin: { lat: number; lng: number } | null = null;
  if (typeof f.lat === 'number' && typeof f.lng === 'number') origin = { lat: f.lat, lng: f.lng };
  else if (nearRaw && f.city) origin = geocodeCity(f.city);
  if (origin) {
    const radius = f.radiusMi ?? 25;
    pool = pool
      .map((l) => ({
        ...l,
        distanceMiles: l.lat != null && l.lng != null ? distanceMi(origin!.lat, origin!.lng, l.lat, l.lng) : undefined,
      }))
      .filter((l) => {
        if (l.isOnlineOnly || (l.distanceMiles ?? Infinity) <= radius) return true;
        // A saved city/state match remains visible if the listing has no coordinates yet.
        return l.distanceMiles === undefined && Boolean(f.city && l.city.toLowerCase().includes(f.city.toLowerCase()) && (!f.region || l.region.toLowerCase() === f.region.toLowerCase()));
      });
  }

  // --- sorting ---
  const sort = filters.sort ?? 'relevance';
  const recentSortNow = Date.now();
  pool.sort((a, b) => {
    switch (sort) {
      case 'rating': return b.rating - a.rating || b.reviewCount - a.reviewCount;
      case 'newest': return (a.addedDaysAgo ?? Number.POSITIVE_INFINITY) - (b.addedDaysAgo ?? Number.POSITIVE_INFINITY);
      case 'recently-updated': {
        const recentA = recentlyUpdatedState(a.recentlyUpdatedAt, recentSortNow)?.timestamp;
        const recentB = recentlyUpdatedState(b.recentlyUpdatedAt, recentSortNow)?.timestamp;
        if (recentA && recentB) return Date.parse(recentB) - Date.parse(recentA);
        if (recentA) return -1;
        if (recentB) return 1;
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.score - a.score || b.rating - a.rating;
      }
      case 'featured': return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (b.verified ? 1 : 0) - (a.verified ? 1 : 0) || b.rating - a.rating;
      case 'recommended': return b.recommendations - a.recommendations;
      case 'popular': return b.views - a.views;
      case 'distance': return (a.distanceMiles ?? 9999) - (b.distanceMiles ?? 9999);
      default: return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.score - a.score || b.rating - a.rating;
    }
  });

  // --- pagination ---
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(50, Math.max(1, filters.perPage ?? 12));
  const total = pool.length;
  const hits = pool.slice((page - 1) * perPage, page * perPage);

  const altLinks = buildAltLinks(filters, hits.length);
  const suggestions = buildSuggestions(q, hits.length);
  return { hits, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)), suggestions, appliedTags: tags, altLinks };
}

/**
 * When a search comes up empty, suggest real pages that DO have results:
 * the same category in each focus city, or popular categories citywide.
 */
export function buildAltLinks(filters: Partial<SearchFilters> & { q?: string; near?: string }, hitCount: number): AltLink[] {
  if (hitCount > 0) return [];
  const links: AltLink[] = [];
  const category = filters.industry?.[0] ?? filters.profession?.[0]
    ?? ['bakery', 'plumber', 'counselor', 'accountant', 'photographer', 'plumbing', 'counseling', 'dentist']
      .find((k) => (filters.q ?? '').toLowerCase().includes(k));

  for (const c of FOCUS_CITIES.slice(0, 4)) {
    const label = category
      ? `${category.charAt(0).toUpperCase() + category.slice(1)} in ${c.city}, ${c.region}`
      : `All listings in ${c.city}, ${c.region}`;
    const href = category
      ? `/search?q=${encodeURIComponent(category)}&near=${encodeURIComponent(`${c.city}, ${c.region}`)}`
      : `/locations/${c.slug}`;
    if (!links.some((l) => l.href === href)) links.push({ label, href });
  }
  if (links.length < 4) {
    links.push({ label: 'Newest listings', href: '/search?sort=newest' });
    links.push({ label: 'Browse industries', href: '/browse/industries' });
  }
  return links.slice(0, 4);
}

export function buildSuggestions(q: string, hitCount: number): string[] {
  if (hitCount > 0 || !q.trim()) {
    return ['bakery #Baptist', 'Christian counselor', 'plumber Dallas', 'accountant Nashville'].filter((s) => s !== q).slice(0, 3);
  }
  return ['Try removing a hashtag', 'Try a different city', 'Browse owner-submitted listings'];
}

export function autocompleteSuggestions(
  fragment: string,
  limit = 8,
  corpus: SampleListing[] = [],
): { label: string; kind: string; value: string }[] {
  const q = fragment.toLowerCase().trim();
  if (!q) return [];
  const out: { label: string; kind: string; value: string }[] = [];
  for (const l of corpus) {
    if (l.name.toLowerCase().includes(q)) out.push({ label: l.name, kind: l.typeSlug, value: l.name });
    if (out.length >= limit) break;
  }
  for (const l of corpus) {
    for (const s of l.services) {
      if (s.toLowerCase().includes(q) && !out.some((o) => o.label === s)) {
        out.push({ label: s, kind: 'service', value: s });
        if (out.length >= limit) break;
      }
    }
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}
