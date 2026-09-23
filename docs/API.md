# API Endpoint Plan

Base: same origin (`/api/*`), JSON for reads, form-POST + redirect for writes (progressive enhancement). Auth: session cookie (web) → Bearer tokens for public API (Phase 2).

## MVP endpoints (implemented)

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/search` | Full search (Postgres FTS or memory engine) | – |
| GET | `/api/suggest` | Entity + hashtag autocomplete | – |
| GET | `/api/favorites?ids=` | Hydrate saved listings | – |
| POST | `/api/listings` | Create listing (`pending_review`) | optional |
| POST | `/api/listings/update` | Owner edit | owner+ |
| POST | `/api/listings/deactivate` | Soft-delete | owner+ |
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

## Conventions

- Validation: Zod (`src/lib/validation.ts`) on every write; errors redirect with `?error=` (forms) or `4xx` JSON (fetch).
- Pagination: `?page=&perPage=` (max 50) → `{ hits, total, page, perPage, totalPages }`.
- Rate limiting: Vercel Firewall rules (prod) + Turnstile on public forms (Phase 1.1).
- Idempotency: natural keys (`slug`, `listing_claims` unique per listing+email) + `onConflictDoNothing` seeds.

## Phase 2 — public API (planned)

- `GET /api/v1/listings`, `/api/v1/listings/:slug`, `/api/v1/events`, `/api/v1/search`
- Token auth (scoped: `read`, `write:listings`), rate limits by plan, OpenAPI + SDK.
- Webhooks: `listing.verified`, `review.published`, `event.created`.
- Mobile apps consume identical contracts; versioned (`/v1`) with sunset policy.
