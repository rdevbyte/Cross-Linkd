# Architecture — CrossLinkd

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Astro 4 (SSR, Vercel adapter) | Content-heavy SEO pages + islands for interactivity |
| Interactive UI | React 18 + Framer Motion | Search, map, QR, favorites, toggles |
| Motion | GSAP (scroll) + Anime.js (micro) | Purposeful, reduced-motion-gated |
| Styling | Tailwind 3 + CSS vars | Light/charcoal-dark themes, design tokens |
| Language | TypeScript (strict) | End-to-end type safety |
| ORM | Drizzle | Lightweight, serverless-friendly, SQL-first |
| Validation | Zod | Shared client/server schemas |
| DB | PostgreSQL (Neon/Supabase) | Relational, FTS (`tsvector`+GIN), trigram fuzzy, PostGIS-ready |
| Auth | JWT sessions (jose) + bcrypt | httpOnly cookies; OAuth-ready |
| Search | Postgres FTS → Meilisearch/Typesense later | Same filter semantics in `src/lib/search.ts` fallback |
| Maps | Leaflet + OSM (Mapbox optional) | No-key default; env-swappable |
| Deploy | Vercel serverless + cron | Preview envs, analytics, edge caching |

## Data model (essentials)

```
users 1—n organizations (via organization_members)
organizations 1—n listings        users 1—n listings (ownerId)
listings n—n industries | professions | denominations | hashtags
listings 1—n listing_locations | listing_services | listing_media | events
listings 1—n reviews | recommendations | verification_badges | listing_claims
users 1—n saved_listings | saved_searches | collections | follows | notifications
reports → listings|reviews|events   moderation_actions + audit_logs (everything sensitive)
subscriptions | payments | featured_placements (Phase 2 monetization)
search_logs | listing_views (analytics)   listing_edits (suggest-an-edit queue)
```

Keys: `gen_random_uuid()` PKs · FK constraints everywhere · `slug` unique for SEO · `created_at/updated_at` · soft delete (`deleted_at`) on users/orgs/listings/events/reviews · GIN on `search_vector`, trigram on names/tags.

## Request flow

1. `src/middleware.ts` → verifies session cookie → `locals.user`.
2. Pages SSR with `locals.user`; React islands hydrate (`client:load` for search/theme, `client:visible` for cards, `client:only` for map).
3. Forms POST to `/api/*` (progressive enhancement — works without JS); Zod-validated; DB or demo-mode branch.
4. Search: `hasDatabase()` ? Postgres `tsvector` + filters : identical in-memory engine over sample data.

## Caching

- Static assets: immutable 1y (vercel.json). API suggest/search: 30–60s `Cache-Control`. Sitemap: 1h.
- Phase 2: Vercel KV for hot searches; ISR for popular taxonomy pages; `stale-while-revalidate` on profiles.

## Security

- Secrets only via env; pooled connections; parameterized queries (Drizzle); bcrypt-12; httpOnly SameSite cookies; role checks (`isAdmin`, `canEditListing`); link-blocking + moderation on reviews; Turnstile-ready; security headers in vercel.json; audit logs.

## Scale-out

- Search → Meilisearch when listings > ~50k (cron delta-sync already stubbed at `/api/cron/search-index`).
- PostGIS ` geography` upgrade path for radius queries (lat/lng numerics today).
- Public API + mobile apps consume the same `/api/*` + token auth (Phase 2).
