# CrossLinkd — Code Review & Health Check

**Date:** 2026-09-24 · **Scope:** full static review of `src/`, migrations, configs, scripts, e2e, docs.
**Stack reviewed:** Astro 7 (SSR) + React 18 · Drizzle ORM + Postgres (Neon) · Vercel · jose/bcrypt auth · Resend mail.

**TL;DR** — The app is well-structured with strong fundamentals (server-side admin gating, hashed single-use
auth tokens, no sample content in prod, security headers, ~242 e2e checks). But there are **6 critical issues**
that should be fixed before any real launch — the worst being that **`POST /api/listings` is completely
unauthenticated** (the public add-listing form posts straight to it), a **stored XSS** in the favorites page,
a **public diagnostics endpoint leaking env var names and DB errors**, and a **hardcoded JWT signing fallback**.
There is also a coherent set of "dead end" features (reviews, verifications, events, password reset) that show
success UI but persist nothing.

---

## 🔴 Critical — fix before launch

### C1. `POST /api/listings` has no authentication — anyone can publish a listing
`src/pages/api/listings.ts:6` — neither the JSON nor the form-data path calls `apiGuard.user()`.
It runs `saveListing(ownerId, parsed.data, { action: 'publish' })` with `ownerId = locals.user?.id ?? null`
— i.e. **immediately published, anonymously**. The public `/add-listing` page
(`src/pages/add-listing.astro:49`) posts directly to this endpoint, so the *main* listing-creation flow has no
auth at all and skips moderation (the authed `api/submissions.ts` with draft/submit support is only used by the
dashboard).

**Fix:** add `apiGuard.user` + require `locals.user` before persisting, and decide (see M1) whether creation
publishes immediately or enters `pending_review`. Consider deleting this endpoint in favor of `/api/submissions`.

### C2. Stored XSS via the favorites page (DB content into `innerHTML`)
`src/pages/favorites.astro:27` — the grid is built with
`grid.innerHTML = items.map((l) => `…${l.name}…${l.tagline}…${l.city}, ${l.region}…`)`.
Those fields are **owner-controlled database values** (from `/api/favorites` → `getPublicListings()`).
Combined with C1, an attacker needs *no account* to create a listing named
`<img src=x onerror=…>`; any visitor who saves it (or has it in `localStorage`) gets script execution on the
CrossLinkd origin. The cookie is HttpOnly, but authenticated endpoints are fully reachable with `fetch` +
same-origin cookies (submit listings/reviews/claims as the victim, read their dashboard data).

Same (lower-severity, self-only) pattern in `dashboard/listings.astro:859` (`tempRow.innerHTML` with
`${listingName}`) and chip templates in `add-listing.astro:488` / `dashboard/listings.astro:610`.

**Fix:** build DOM with `document.createElement`/`textContent`, or HTML-escape every interpolated value; never
`innerHTML` with remote data. Add a CSP header (S8) as a second layer.

### C3. `/api/health` leaks environment & infrastructure details to anonymous visitors
`src/pages/api/health.ts` returns, to anyone:
- `visibleEnvKeys` — **the full list of env var names set on the deployment** (`Object.keys(process.env)`),
  which reveals that `RESEND_API_KEY`, `CRON_SECRET`, `DIRECT_URL`, etc. exist;
- `authSecretSet` / `adminSetupKeySet` booleans;
- `dbError: err.message` — raw Postgres/Neon error text (host, user, SSL errors).

It's a dev diagnostic left public.

**Fix:** require admin (or a `HEALTH_SECRET`) and/or strip `visibleEnvKeys` + `dbError` in production; keep a
minimal `{ ok, dbConnected }` public variant if you want an uptime probe.

### C4. Hardcoded JWT signing fallback — session forgery if `AUTH_SECRET` is unset
`src/lib/auth.ts:13` — `AUTH_SECRET` falls back to a **public string in the repo**
(`'crosslinkd-production-stable-fallback-auth-key-2026'`). If the env var is ever missing in production
(misconfig, new region, forgotten preview promotion), anyone can mint valid 30-day session JWTs for *any*
user, including `super_admin`, because the token carries the role.

**Fix:** fail closed — in production, refuse to create/verify sessions (503) when `AUTH_SECRET` is absent.
`/api/health` (C3) can surface the misconfig to the owner privately.

### C5. IDOR: `POST /api/listings/update.ts` — any signed-in user can edit any listing
`src/pages/api/listings/update.ts:15` — `db.update(listings).set({ name, tagline, description, website, phone,
priceRange … }).where(eq(listings.id, id))` with **no ownership check and no validation** (empty `name`,
arbitrary `website` string incl. `javascript:`). The comment says "ownership-checked in production" — it is not.
It's not referenced by any UI (the dashboard uses `PATCH /api/listings/[id]`), but the endpoint is live and any
member account can hit it directly.

**Fix:** delete the endpoint (recommended; `PATCH /api/listings/[id]` already covers it with ownership checks),
or add `apiGuard.user` + ownership check + `listingPatchSchema` validation.

### C6. Password reset is functionally broken (dead link + unreachable confirm branch)
- The emailed link is `appUrl('/auth/reset?token=…')` (`src/pages/api/auth/reset.ts:41`).
- `src/pages/auth/reset.astro` **never reads the `token` param** — it renders only the "request link" form.
- The API's confirm branch requires a form field `intent=confirm`, which **no UI ever sends**.

Result: users who forget their password cannot reset it (magic-link sign-in still works, but the password is
never changeable). Notably, the e2e suite (`e2e-auth.mjs`) has **no reset test**, and `LAUNCH_CHECKLIST.md`
claims reset is "verified live end-to-end" — that claim is not supported by the code.

**Fix:** when the page has a `token` param, render a confirm form (new password + hidden `intent=confirm`);
add an e2e case. (Also consider rotating out old sessions on reset — see H2.)

---

## 🟠 High

### H1. No rate limiting / brute-force protection anywhere (known, still a blocker)
Signup, signin, magic-link, reset, review submission, claims, contact, feedback, and listing creation all have
zero throttling (checklist item B5). Passwords are bcrypt-12 (good), but credential stuffing and form spam will
arrive day one. **Fix:** Vercel Firewall/WAF rules and/or per-IP token bucket (`@upstash/ratelimit`) on
`/api/auth/*`, `/api/listings*`, `/api/reviews`, `/api/claims`, `/api/contact`, `/api/feedback`; Turnstile on
public forms.

### H2. 30-day stateless JWT with role embedded — no revocation path
`src/lib/auth.ts:41` — sessions live 30 days, carry `role`, and there is no server-side invalidation: signout
only clears the cookie; demoting an admin keeps their admin token valid up to 30 days (docs acknowledge this);
password reset doesn't kill old sessions. The schema already has a `sessions` table (`src/db/schema.ts`) that is
**never used**. **Fix (any of):** short-lived access token + refresh; a `jti` claim checked against a DB
`sessions` row (at least for `/api/admin/*` and role-changing endpoints); or `sessions_valid_after` on `users`
bumped at signout/reset/role-change and checked in middleware.

### H3. CSRF protection is weaker than it looks
- `astro.config.mjs:32` sets `security: { checkOrigin: false }` (Astro's built-in check disabled), so only the
  custom middleware rule applies.
- `src/middleware.ts:26-29` allows **any `*.vercel.app` origin** (any Vercel user can host a page that
  POSTs to your deployment with the victim's cookie), plus substring matches `includes('localhost')` /
  `includes('127.0.0.1')` which crafted hostnames can satisfy.
- `SameSite=Lax` (modern browsers) is the thing actually stopping most of this — don't rely on it alone.

**Fix:** keep `checkOrigin` on, or make the middleware an exact-host allowlist (request `host` +
`PUBLIC_SITE_URL` + `*.vercel.app` only when *you* own the project, + localhost in dev only).

### H4. Postgres FTS search path is buggy and unused by the main UI
`src/pages/api/search.ts:34` — the tsquery is assembled from raw user words
(`w => `${w}:*`` joined with ` & `): queries containing `&`, `|`, `!`, `(`, `)`, quotes, or unicode operators
make `to_tsquery` throw → the endpoint **silently falls back to the in-memory engine**. Also:
- `total: rows.length` reports the *page* size as the total → pagination metadata is wrong;
- `perPage`/`minRating`/`page` are `Number()`-parsed with no validation (NaN → `LIMIT NaN` error → fallback,
  or in the in-memory engine `minRating=abc` filters out **all** results via `rating >= NaN`);
- the response shape differs from the demo engine (`hits` are slim rows, no `score`/location).
Meanwhile the actual `/search` page (`src/pages/search.astro:83`) **never calls this endpoint** — it runs the
in-memory `searchListings()` over the DB rows. All the FTS work (generated `search_vector` column, GIN index,
`pg_trgm`, cron) is effectively dead.

**Fix:** either (a) make `/search` call the Postgres path for the text query (use `websearch_to_tsquery` —
tolerates user syntax; count via `count(*)` for `total`; validate params with the existing
`searchFilterSchema`), or (b) delete the API + FTS columns until Phase 2's Meilisearch. Don't ship both.

### H5. Public corpus hard-capped at 500 rows; every public page scans it in memory
`src/lib/publicListings.ts:23` — `getDbPublished()` does `…orderBy(publishedAt desc).limit(500)` and is the
**single source** for search, directory, browse, homepage, sitemap, autocomplete, and favorites.
`findPublicListing(slug)` (line 66) re-loads all 500 and linearly scans per detail view.
Consequences at >500 listings: older listings **silently vanish** from every public surface and their detail
pages 404. Per-request cost (500 rows + 2 joins + in-memory sort) also grows unbounded.

**Fix:** query `listings` directly by slug for detail pages (1 row), page the directory pages in SQL
(keyset pagination), and keep the in-memory engine only as a demo-mode fallback.

### H6. Review pipeline is a dead end at the final step
- Reviews are accepted into `pending` (`src/pages/api/reviews.ts`) — but `src/pages/admin/reviews.astro:74-75`
  "Publish" / "Remove" buttons are `onclick="alert(…)"` stubs. No code path ever sets `status='published'`.
- `avg_rating` / `review_count` are never aggregated (the cron that should do it,
  `src/pages/api/cron/search-index.ts`, is a `console.log` stub).
- Net effect: all DB listings permanently show **0★ (0 reviews)**; rating sort / min-rating filter / public
  testimonials are dead for real content.

**Fix:** implement the admin publish/remove API (guard `apiGuard.admin`, update listing aggregates in a
transaction), and make the cron actually recompute aggregates. If not in scope for launch, hide the review form.

### H7. "Success without persistence" — fake success states on stub endpoints
These redirect to a success page while persisting nothing (or swallowing errors):
- `api/verifications.ts` — logs to console, redirects `?submitted=1`;
- `api/events.ts` — same ("event created" that doesn't exist);
- `api/reviews/respond.ts` — owner response never saved;
- `api/listings/deactivate.ts` — no-op;
- `api/reviews.ts` / `api/claims.ts` — DB errors are caught, logged, **then the user is redirected to the
  success page anyway** (claims also inserts with an unvalidated `listingId`, so FK failures silently "succeed").

**Fix:** either implement, or return a 501/`coming-soon` state and surface insert failures as errors.

---

## 🟡 Medium

**M1. Workflow docs vs. behavior.** `DEPLOY.md` promises `Draft → Pending Review → Approved` with a moderation
queue; the code's default is **publish immediately** (DB column default is `'published'` — migration
`0002`; `saveListing()` default action `'publish'`; the public form path in `api/listings.ts` hardcodes
`action: 'publish'`). The admin queue only ever sees explicit `submit`s from the dashboard. Decide the policy
and align code, docs, and the `add-listing` form.

**M2. `consumeAuthToken` is not atomic** (`src/lib/auth.ts:88-105`) — check-then-update means a magic/reset/verify
link opened in two tabs can be consumed twice (two sign-ins on one link). Use
`UPDATE … SET used_at = now() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() RETURNING user_id`.

**M3. Unbounded arrays / inputs in validation** (`src/lib/validation.ts`) — `hashtags`, `languages`,
`accessibility`, `industries`, `professions` arrays have no `.max(n)`; `hashtags` are collected in the form but
**never persisted** by `saveListing` (the `hashtags`/`listing_hashtags` tables are never written). Also
`reviewInputSchema.rating` allows fractions (`4.7`) into a `smallint` column.

**M4. `uniqueSlug`** (`src/lib/submissions.ts:24`) runs `ilike(slug, base || '%')` — an unbounded prefix scan;
fine today, expensive once `the-*` style slugs accumulate. Consider a per-name counter or `exists` check.

**M5. CSV export issues.** `api/admin/export.ts` — (a) the guard is conditional on
`NODE_ENV==='production' && DATABASE_URL` instead of `apiGuard.admin` (works on Vercel today, but it's a trap);
(b) no CSV formula-injection sanitization on owner-controlled fields (`=cmd|…`, `+`, `@`, leading `-`).
`api/listings/export.ts` is unauthenticated and exports *sample* data regardless of the caller (it should
export the caller's own listings).

**M6. Cron endpoints** (`api/cron/*`) — unauthenticated when `CRON_SECRET` is unset (the `if` only fires when the
env var exists), and the bearer comparison isn't constant-time. If `CRON_SECRET` is configured they're fine, but
make the fail-mode closed (401 when unset in prod).

**M7. `getDatabaseUrl()` runtime fallback chain** (`src/db/client.ts:15-21`) includes `DIRECT_URL` (unpooled) as
a *runtime* fallback with `max: 4` — a misconfigured deployment silently uses the direct pool and will exhaust
connections under load. Prefer pooled-only at runtime; use `DIRECT_URL` for CLI/migrations only.

**M8. `.gitignore` landmines** — `data/` (no leading slash) matches **`src/data/`**: any *new* file added under
`src/data/` is silently ignored by git (existing files are safe only because they're already tracked). And
`README.md` is ignored (commit "added readme to the gitignore") — the public repo ships with no README at all.
Both look accidental.

**M9. Migration runner has no state** (`src/db/migrate.ts`) — re-executes *all* statements on every run, relying
on `IF NOT EXISTS` + ignored SQLSTATEs (42710/42P07/…). It works, but there's no `schema_migrations` table, so a
future non-idempotent migration is a footgun; and the drizzle journal (`drizzle/meta/_journal.json`) is stale
(2 entries) while 4+ SQL files exist — two parallel, out-of-sync migration systems. Also `0001_init.sql` and
`0001_launch_…sql` share an index; ordering only works by accident of alphabetical sort (`init` < `launch`).

**M10. Signin error leak** (`src/pages/api/auth/signin.ts:33-36`) — the catch redirects with
`error=Sign in failed: ${err.message}`, exposing internal error text (DB errors, etc.) to the client. Return a
generic message; log the detail server-side. (The commit message "add safe signin error handling" doesn't match.)

**M11. Signup signs you in before email verification** — the session cookie is set immediately after
registration (`api/auth/signup.ts:45-49`), and nothing gates features on `emailVerifiedAt`. If unverified
accounts should be restricted (e.g., can't publish), that enforcement is missing; otherwise document it as
intentional.

**M12. Missing CSP + external fonts.** No `Content-Security-Policy` in `vercel.json` headers — with a live
stored-XSS (C2) this matters; a `default-src 'self'` + per-request nonce (or at least `script-src`) would have
contained the blast radius. Google Fonts is loaded from `fonts.googleapis.com` on every page (privacy + FOUT;
checklist already notes self-hosting as a nice-to-have).

**M13. Performance at scale (beyond 500 listings).** Every public page executes the 500-row catalog query
(no caching); `/api/suggest` re-loads the full catalog per keystroke request; the search page sorts/filters the
whole corpus in JS per request. Add `Cache-Control`/Vercel ISR on catalog reads and cap autocomplete against a
lighter query.

**M14. `articles/[slug].astro:53` uses `set:html`** on content — currently safe (static, dev-authored
`src/data/articles.ts`), but it's a pattern that breaks the moment articles become dynamic. Escape or use a
whitelisted renderer.

---

## 🟢 Good / working as intended

- **Server-side authorization is consistent**: `requireAdminPage` / `apiGuard.{user,admin,root}` on all admin
  pages and `/api/admin/*` with proper 401/403/404 semantics; role changes self-protected; admin export is
  gated (see M5 for the odd guard style).
- **Auth token hygiene**: single-use tokens stored **hashed** with short TTLs; magic-link & reset request flows
  are user-enumeration-safe (same response either way); setup key compared **timing-safe** and self-disables
  after the first super-admin; signup hard-codes `role: 'member'`.
- **Bundled sample business listings have been removed** from source, seed, search, directory, autocomplete, and exports. The remaining `SHOW_SAMPLE_CONTENT` gate applies only to illustrative non-listing content such as local preview events/testimonials.
- **Security headers** present (nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy); cookies are
  HttpOnly + SameSite=Lax + Secure-in-prod; bcrypt cost 12.
- **Privacy flags respected**: `showEmail/showPhone/showWebsite/showAddress/showDenomination` are enforced in
  `mapListingRow` for public rendering.
- **Validation** via zod on most inputs; Astro's default escaping makes server-rendered surfaces safe (the XSS
  is confined to the three `innerHTML` sites).
- **e2e coverage** (~242 Playwright checks across 4 suites) + honest docs (`LAUNCH_CHECKLIST.md` is refreshingly
  candid about blockers).

---

## Suggested order of work

1. **C1 + C5** — gate/delete the open listing endpoints (1 h)
2. **C2** — escape/fix the `innerHTML` sites + add CSP header (2–3 h)
3. **C3 + C4** — strip/protect `/api/health`, fail-closed on missing `AUTH_SECRET` (1 h)
4. **C6** — finish the password-reset confirm UI + e2e (1–2 h)
5. **H1** — rate limiting on auth + public forms (2–4 h, checklist B5)
6. **H4 + H5** — pick one search path (Postgres FTS *or* in-memory), fix the 500-row cap for detail/sitemap
   pages (4–8 h)
7. **H6** — review publish/remove + aggregate cron, or hide the review form (2–4 h)
8. **H2/H3** — session revocation + tighten CSRF allowlist (2–4 h)
9. **H7/M-series** — fix fake-success states, migration state, `.gitignore`, README, CSV, NaN params, etc.

---

## ✅ Fix status (post-review implementation)

Status legend: **FIXED** = code changed and verified by the checks listed under
*Test evidence*; **PARTIAL** = an application-level mitigation exists but production enforcement
remains incomplete; **VERIFIED** = reviewed, no change needed; **SCOPE** = deliberately
deferred (needs a product decision or infrastructure). Claims below are limited to
what the shipped code does; nothing here depends on an unrun test.

### Critical
| ID | Status | What was done |
|----|--------|---------------|
| C1 | **FIXED** | `POST /api/listings` stays open for guests (public "add a listing" form) but guest submissions now go to `pending_review` (moderation queue); only signed-in users publish immediately. The success page says which one happened. |
| C2 | **FIXED** | `favorites.astro` builds cards with `createElement`/`textContent` instead of `innerHTML`; `directory/[slug]` and search already escaped through Astro. JSON-LD is serialized with `safeJsonLd` (escapes `<`, `>`, `&`, U+2028/9) so a listing name can no longer break out of `<script type="application/ld+json">`. CSP header: **SCOPE**. |
| C3 | **FIXED** | `/api/health` returns `{ok, dbConnected}` to anonymous callers; env-key names, DB errors and config flags are only returned to staff sessions. |
| C4 | **FIXED** | No hardcoded JWT fallback in production: `getAuthSecret()` fails **closed** (sessions unreadable, sign-in/sign-up/magic-link/reset return "temporarily unavailable"). A stable dev-only key keeps local work running. Tokens minted with one key are rejected under another. |
| C5 | **FIXED** | `api/listings/update.ts` and `api/listings/deactivate.ts` deleted (both wrote to an unowned/legacy shape). Editing goes through the owner-checked `api/listings/[id].ts`, which now also permits editing *published* listings and merges partial PATCH bodies over the stored row before re-validating. |
| C6 | **FIXED** | `/auth/reset?token=…` renders a confirm form; `POST /api/auth/reset` (`intent=confirm`) validates, consumes the single-use token, sets the new hash and bumps the session watermark (all other sessions die). Validation errors re-redirect **with** the token so the user is not stranded. |

### High
| ID | Status | What was done |
|----|--------|---------------|
| H1 | **PARTIAL** | `src/lib/rateLimit.mjs` applies in-process throttles to sign-in (IP + email), sign-up, magic-link (IP + email), reset (IP + email), reviews and other public forms. On Vercel, instances do not share the map, so this is best-effort only; global enforcement still requires configured WAF rules or shared storage. Limited requests redirect with an explicit error. |
| H2 | **FIXED** | `users.sessions_valid_after` (migration `drizzle/0004_users_sessions_valid_after.sql`). Tokens carry `issuedAt`; middleware rejects tokens issued before the watermark and also rejects soft-deleted users. Bumped on sign-out (= sign out everywhere), password reset, role change (API and `scripts/admin-promote.ts`), and account deletion. `GET /api/auth/signout` removed (logout must be a POST). |
| H3 | **FIXED** | Middleware origin check is an exact-host allow-list (own host, `PUBLIC_SITE_URL`, production hosts, loopback outside production). `*.vercel.app` wildcards and `startsWith('http://localhost')` prefix matches are gone. |
| H4 | **FIXED** | Postgres search uses `websearch_to_tsquery` (user input can no longer throw and silently drop to the demo engine), validates `page`/`perPage`/`minRating` (NaN-safe, `perPage ≤ 50`) and returns a real `total`. |
| H5 | **FIXED / partial** | Listing detail reads by slug directly (`limit 1`) instead of loading the 500-row catalog; hashtags are joined. Public search/sort still uses the capped catalog — pagination of that surface remains **SCOPE**. |
| H6 | **FIXED** | `api/admin/reviews/[id]` no longer swallows early returns inside the transaction (a not-found/invalid moderation used to fall through and return 200). Review submission failures redirect with an honest error instead of "thanks". |
| H7 | **FIXED** | Sign-in/sign-up/magic-link/reset without a DB or secret respond 303 with a clear error (previously 500). `POST /api/listings` reports `status` so the UI never claims "live" for a queued listing. |

### Medium (selected)
| ID | Status | What was done |
|----|--------|---------------|
| M1 | **FIXED** | Guest submissions queue for review (see C1); signed-in publish is unchanged. |
| M2 | **FIXED** | `consumeAuthToken` is a single conditional `UPDATE … WHERE used_at IS NULL … RETURNING`. |
| M3 | **FIXED** | Validation split into a base schema + refinements so PATCH `.partial()` works; `website` accepts only `http(s)`; review `listingId` is a UUID and `rating` an integer 1–5; hashtags are persisted (`listing_hashtags`) inside the same transaction as the listing. |
| M4 | **VERIFIED** | `uniqueSlug` prefix scan retained (fine at current scale). |
| M5 | **VERIFIED** | Admin export guard unchanged in this pass. |
| M6 | **FIXED** | `src/lib/cronAuth.ts`: cron endpoints fail **closed** in production when `CRON_SECRET` is unset; comparison is constant-time. |
| M7 | **VERIFIED** | Runtime uses `DATABASE_URL`; `DIRECT_URL` is only used by `db:migrate`. |
| M8 | **FIXED** | `.gitignore`: `data/` anchored to `/data/` (it silently ignored new files under `src/data/`); `README.md` un-ignored. |
| M9 | **FIXED** | `db:migrate` records applied files in `schema_migrations`; `0001_init.sql` split with `--> statement-breakpoint` and no longer requires PostGIS (the app never used it). |
| M10 | **FIXED** | Auth handlers return generic messages; details are logged server-side without request bodies. |
| M11 | **SCOPE** | Signup still signs in before email verification. |
| M12 | **SCOPE** | No CSP header yet. |
| M13 | **SCOPE** | Caching/ISR of the catalog. |
| M14 | **VERIFIED** | Article content is rendered from trusted local data only. |

### Additional defects found and fixed during implementation
- **`/add-listing` form script was dead in browsers** — the `define:vars` (inline) script
  contained TypeScript assertions (`as HTMLButtonElement | null`) that Astro ships verbatim,
  which is a JavaScript `SyntaxError`; the whole interactive form (progress, chips, publish
  button, online toggle) never initialised. Removed the assertions; the served script now parses.
- **`PUBLIC_SITE_URL` resolution differed between `astro.config.mjs`, `BaseLayout` and the
  mailer** — unified in `src/lib/siteUrl.mjs` (`resolveSiteUrl`).
- **`SearchBar` location picks were typed as `SuggestItem`** although the caller passes
  `LocationChoice` objects without `kind`.
- **Mailer logged full message bodies (magic links, reset links) in production** when no
  provider was configured — now an error line only.
- **`e2e-listing-creation`** asserted `text=Your listing is now live!`; the page says
  `Your listing is now live` (no `!`).
- Type-check errors in `BaseLayout.astro` (`show` implicit any) and `articles/[slug].astro`
  (predicate on a possibly-undefined value) fixed.

### Test evidence (this pass)
| Check | Result |
|-------|--------|
| `npx astro check` (162 files) | 0 errors |
| `npx tsc --noEmit` | clean |
| `npm test` (launch-guards 8, hiring-url 3, online-toggle + review-publish 6, `scripts/lib.test.mjs` 11) | 28/28 pass |
| `npx astro build` | succeeds |
| Dev-server smoke (no DB): auth POSTs 303 (not 500), deleted routes 404, foreign `*.vercel.app`/`localhost.evil.com` origins 403, `/api/health` minimal, reset confirm form renders, sign-in rate limit trips, JSON-LD parses with no raw `<>&`, `/add-listing` inline script parses | pass |

The Playwright e2e suites (`e2e-*.mjs`) require a running Postgres and were **not** run in
this pass; run them after `npm run db:migrate` to re-baseline.
