# SEO Strategy

## URL design (clean, canonical, stable)

- Profiles: `/directory/[slug]` (slug never reused; renames keep 301 map in Phase 2).
- Taxonomy: `/industries/[slug]`, `/professions/[slug]`, `/denominations/[slug]`, `/locations/[city-state]`, `/events/[slug]`.
- Search is canonicalized to `/search` (query params; `noindex` on thin combos via robots meta when `total < 3` — Phase 1.1).

## Indexation rules (no thin pages)

- Taxonomy/location pages index **only** with ≥3 listings + unique description (enforced in `sitemap.xml.ts`).
- Admin/dashboard/auth/API: `noindex` + `Disallow` in robots.txt.
- One canonical per entity; breadcrumbs on profiles/events.

## Structured data

- `WebSite` + `SearchAction` (homepage), `LocalBusiness` + `AggregateRating` (profiles), `Event` (events), `BreadcrumbList` (profiles). See `src/lib/seo.ts`.

## Metadata

- Dynamic titles/descriptions per route; OG + Twitter cards; `og-cover.jpg` default (replace with branded render in prod).
- Sitemap: live at `/sitemap.xml`, refreshed nightly via cron; submit in Search Console.

## Internal linking

- Homepage → taxonomy hubs → entities; profiles → related listings + hashtag searches; events ↔ organizers. Footer hubs for crawl depth ≤ 3.

## Performance (Core Web Vitals)

- SSR + islands (minimal JS), `client:visible/only` for below-fold, immutable asset caching, image optimization via Vercel Image (Phase 1.1 for uploads).
