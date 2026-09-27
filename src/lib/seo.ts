const SITE = () =>
  (import.meta.env.PUBLIC_SITE_URL as string | undefined) ??
  process.env.PUBLIC_SITE_URL ??
  'https://cross-linkd.vercel.app';

export interface SeoInput {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
  noindex?: boolean;
  schema?: Record<string, unknown> | Record<string, unknown>[];
}

export function buildSeo(input: SeoInput) {
  const url = `${SITE()}${input.path ?? '/'}`;
  const image = input.image ?? `${SITE()}/og-cover.jpg`;
  return { ...input, url, image, siteName: 'CrossLinkd' };
}

export function localBusinessSchema(l: {
  name: string; description?: string; url: string; phone?: string; email?: string;
  city?: string; region?: string; rating?: number; reviewCount?: number;
  image?: string; priceRange?: string; sameAs?: string[]; openingHours?: string[];
  lat?: number; lng?: number;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: l.name,
    description: l.description,
    url: l.url,
    telephone: l.phone,
    email: l.email,
    image: l.image,
    priceRange: l.priceRange,
    address: { '@type': 'PostalAddress', addressLocality: l.city, addressRegion: l.region },
    ...(l.lat && l.lng ? { geo: { '@type': 'GeoCoordinates', latitude: l.lat, longitude: l.lng } } : {}),
    ...(l.sameAs?.length ? { sameAs: l.sameAs } : {}),
    ...(l.openingHours?.length ? { openingHoursSpecification: l.openingHours } : {}),
    ...((l.reviewCount ?? 0) > 0 && l.rating ? {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: l.rating, reviewCount: l.reviewCount },
    } : {}),
  };
}

export function articleSchema(a: {
  title: string; description?: string; url: string; author?: string;
  publishedDaysAgo?: number; updatedDaysAgo?: number;
}) {
  const iso = (daysAgo?: number) => {
    const d = new Date();
    d.setDate(d.getDate() - (daysAgo ?? 0));
    return d.toISOString();
  };
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    url: a.url,
    author: { '@type': 'Organization', name: a.author ?? 'CrossLinkd' },
    publisher: { '@type': 'Organization', name: 'CrossLinkd' },
    datePublished: iso(a.publishedDaysAgo),
    dateModified: iso(a.updatedDaysAgo ?? a.publishedDaysAgo),
  };
}

export function eventSchema(e: { name: string; description?: string; url: string; start: string; end?: string; city?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.name, description: e.description, url: e.url,
    startDate: e.start, endDate: e.end,
    eventAttendanceMode: 'https://schema.org/MixedEventAttendanceMode',
    location: { '@type': 'Place', name: e.city ?? 'See event details' },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, item: it.url,
    })),
  };
}
