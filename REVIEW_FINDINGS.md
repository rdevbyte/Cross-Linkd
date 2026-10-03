# Repository review and remediation status

**Scope:** Read-only repository review followed by targeted fixes in the original source paths. Existing unrelated, uncommitted listing/taxonomy work was preserved. The verification/event demo workflow was not implemented, consistent with the stated scope constraint.

## Addressed findings

### Admin export authorization

**File:** `src/pages/api/admin/export.ts`

The route now applies `apiGuard.admin` unconditionally, independent of which supported database URL variable is set. This also protects the taxonomy export.

### Auth redirect validation

**Files:**
- `src/lib/formGuards.mjs`
- `src/pages/api/auth/signin.ts`
- `src/pages/api/auth/magic-link.ts`
- `scripts/launch-guards.test.mjs`

Added `safeLocalPath`, which rejects protocol-relative, backslash-based, and control-character destinations and only returns a same-origin path. Password sign-in and both magic-link stages now use it. Added tests for ordinary local paths and rejected external forms.

### Review and owner-response moderation

**Files:**
- `src/pages/api/reviews/respond.ts`
- `src/pages/api/admin/reviews/[id].ts`
- `src/pages/dashboard/reviews.astro`
- `src/pages/admin/reviews.astro`
- `src/lib/publicListings.ts`
- `src/db/schema.ts`
- `drizzle/0008_owner_response_moderation.sql`

An owner may submit one bounded response to a published review on a listing they own. The response stays private until an administrator approves it through a new section of the existing review queue. Removing a pending response consumes the one-response limit. The dashboard distinguishes pending, approved, and removed responses; public listing details load only published reviews and expose owner responses only after approval. A backfill marks any pre-existing response as already approved so it is not accidentally re-queued.

### Feedback email abuse

**File:** `src/pages/api/feedback.ts`

Added a per-IP request limit before processing submissions so repeated valid requests cannot trigger unlimited feedback emails within one process window.

### CSV formula injection

**File:** `src/pages/api/admin/export.ts`

CSV cells beginning with spreadsheet formula characters (including after leading whitespace/control characters) are now prefixed with an apostrophe before CSV quoting.

### Rate-limit map growth

**File:** `src/lib/rateLimit.mjs`

Expired buckets are periodically pruned and the number of stored keys is capped. **The limiter remains process-local**: this reduces unbounded memory growth but does not provide shared enforcement across serverless instances.

### Health status when production has no database

**File:** `src/pages/api/health.ts`

The route now returns a failing status in production if the database is not configured. No-database local/preview mode can still return HTTP 200.

## Partially mitigated; still needs a scalable query redesign

### Full-catalog hydration in public search/autocomplete

**Files:**
- `src/pages/api/search.ts`
- `src/pages/api/suggest.ts`
- `src/lib/publicListings.ts`

Search and autocomplete now have per-IP request limits and shared-cache headers to reduce repeated work. However, structured database searches and autocomplete can still hydrate the full published catalog on cache misses. Correct SQL-side filtering and pagination should be implemented and verified against a live database before treating this scaling issue as fully resolved.

## Intentionally unchanged demo paths

- `src/pages/api/events.ts:3–10`
- `src/pages/api/verifications.ts:3–13`

These still log submissions and redirect without persisting them; the verification endpoint does not store uploaded documents. They are explicitly marked as demo/future work, and the scalable verification workflow remains out of scope.

## Validation

- `node --test scripts/launch-guards.test.mjs`: **15 passed**.
- `node --test scripts/hiring-url.test.mjs scripts/online-toggle.test.mjs scripts/review-publish.test.mjs`: **15 passed**.
- Broader `node --test scripts/*.test.mjs` was attempted: **38 passed, 12 failed during module loading** because Node could not import TypeScript files directly and the workspace has no `tsx` loader installed; those failures did not reach test assertions. This environment is Node 20.20.2 while the project requires Node >=22.12.
- Targeted helper probes for same-origin redirect validation, rate-limit boundaries, and CSV formula detection passed.
- `git diff --check` passed.
- Full `npm test` and `npm run typecheck` could not be completed because this workspace has no installed `tsx` or `astro` executable. Database-backed behavior and a production build remain unverified; no database is configured here.
