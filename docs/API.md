# API Endpoint Plan

Base: same origin (`/api/*`), JSON for reads, form-POST + redirect for writes (progressive enhancement). Auth: session cookie (web) → Bearer tokens for public API (Phase 2).

## MVP endpoints (implemented)

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/search` | Published-listing search; Postgres filters, counts, sorts, and paginates before page-only hydration | – |
| GET | `/api/suggest` | Entity + hashtag autocomplete | – |
| GET | `/api/favorites?ids=` | Hydrate saved listings | – |
| POST | `/api/listings` | Create listing (signed-in publishes; guest enters review) | optional |
| PATCH | `/api/listings/:id` | Edit an owned listing | owner |
| DELETE | `/api/listings/:id` | Archive an owned listing | owner |
| GET | `/api/listings/export` | CSV export | owner |
| POST | `/api/claims` | File claim | optional |
| POST | `/api/reviews` | Submit review (`pending`) | optional |
| POST | `/api/reviews/respond` | Owner response | owner |
| POST | `/api/verifications` | Submit badge evidence | owner |
| POST | `/api/events` | Create event | owner |
| POST | `/api/contact` | Contact/report message | – |
| POST | `/api/auth/signup|signin|signout|magic-link|reset` | Session lifecycle | – |
| GET | `/api/admin/export?table=` | CSV/JSON exports | admin |
| GET | `/api/cron/refresh-sitemap` | Nightly sitemap ping | cron secret |
| GET | `/api/cron/search-index` | Index maintenance | cron secret |

## Listing taxonomy payload

`POST /api/listings` and `PATCH /api/listings/:id` accept `industrySlug`, `categorySlug`, `professions` (canonical profession slugs), `customProfessions` (free-text names), and `services` (selected examples and custom labels). The hierarchy is Industry → Category → Profession → Services. Legacy slug aliases and previous category parents are normalized at validation/read/write time; integrations should use canonical slugs returned by the taxonomy export. See [`TAXONOMY.md`](TAXONOMY.md) for migration and rollout guidance.

## Conventions

- Validation: Zod (`src/lib/validation.ts`) on every write; errors redirect with `?error=` (forms) or `4xx` JSON (fetch).
- Pagination: `?page=&perPage=` (max 50) → `{ hits, total, page, perPage, totalPages }`.
- Rate limiting: API limits use atomic fixed-window counters in the shared Postgres `shared_rate_limits` table, so Vercel instances enforce the same per-key budgets. Keys are SHA-256 digests. Apply `drizzle/0009_shared_rate_limits.sql` with `npm run db:migrate`; production fails closed if the shared store is unavailable. Local development without a database uses the process-local helper.
- Search analytics: successful database searches record sanitized terms and result counts in `search_logs` with records older than 90 days pruned periodically during search activity. Admin analytics shows weekly volume and frequent zero-result terms. Search failure details are written to server logs with a request ID; the API returns that ID with a generic 503 response.
- Idempotency: natural keys (`slug`, `listing_claims` unique per listing+email) + `onConflictDoNothing` seeds.

## Phase 2 — public API (planned)

- `GET /api/v1/listings`, `/api/v1/listings/:slug`, `/api/v1/events`, `/api/v1/search`
- Token auth (scoped: `read`, `write:listings`), rate limits by plan, OpenAPI + SDK.
- Webhooks: `listing.verified`, `review.published`, `event.created`.
- Mobile apps consume identical contracts; versioned (`/v1`) with sunset policy.
