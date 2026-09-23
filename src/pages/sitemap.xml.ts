import type { APIRoute } from 'astro';
import { getPublicListings } from '@/lib/publicListings';
import { SAMPLE_EVENTS } from '@/data/events';
import { includeSamples } from '@/lib/sampleGate';
import { FOCUS_STATES } from '@/data/locations';
import { INDUSTRIES } from '@/data/industries';
import { DENOMINATIONS } from '@/data/denominations';

/** GET /sitemap.xml — only substantive pages (no thin/duplicate URLs). Merges live DB listings with curated samples. */
export const GET: APIRoute = async ({ site }) => {
  const base = site?.toString().replace(/\/$/, '') ?? 'https://crosslinkd.example.com';
  const listings = await getPublicListings();
  const urls: string[] = [
    '', '/search', '/events', '/about', '/trust', '/help', '/contact',
    '/how-it-works', '/verification', '/articles', '/claim-listing', '/add-listing',
    '/browse/industries', '/browse/professions', '/browse/denominations', '/browse/locations',
    // Focus-state pages (only states with real listings):
    ...FOCUS_STATES.filter((s) => listings.some((l) => l.region === s.abbr)).map((s) => `/states/${s.slug}`),
    // Only index city pages with real listings:
    ...[...new Map(listings.filter((l) => !l.isOnlineOnly).map((l) => [`${l.city.toLowerCase().replace(/\s+/g, '-')}-${l.region.toLowerCase()}`, l])).keys()].map((s) => `/locations/${s}`),
    ...listings.map((l) => `/directory/${l.slug}`),
    ...(includeSamples() ? SAMPLE_EVENTS : []).map((e) => `/events/${e.slug}`),
    // Only index taxonomy pages with real listings behind them:
    ...INDUSTRIES.filter((i) => listings.some((l) => l.industries.includes(i.slug))).map((i) => `/industries/${i.slug}`),
    ...DENOMINATIONS.filter((d) => listings.some((l) => l.denominations.includes(d.slug))).map((d) => `/denominations/${d.slug}`),
  ].filter(Boolean);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
    urls.map((u) => `  <url><loc>${base}${u || '/'}</loc><changefreq>weekly</changefreq></url>`).join('\n')
  }\n</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' } });
};
