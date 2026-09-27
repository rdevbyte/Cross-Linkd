# CrossLinkd

A premium faith-based discovery platform for Christian-owned businesses, churches,
ministries, professionals, and events. Astro 7 + React + Drizzle ORM + Postgres,
deployed to Vercel.

> **Security note:** this codebase includes a full code-review pass with every fix
> implemented and verified by the e2e suites. Read
> [`CODE_REVIEW.md`](./CODE_REVIEW.md) for the findings and their fix status.

---

## Requirements

- **Node.js ≥ 22.12** (Astro 7 requirement). Verify with `node -v`.
- **Windows, macOS, and Linux are all supported.** No system Postgres needed —
  an **embedded Postgres** runs in `data/db` on port **5433** (started by
  `scripts/start-pg.mjs`, which always initializes the cluster with **UTF-8**
  encoding regardless of your OS locale).
- For production: any Postgres (e.g. your Neon instance) via `DATABASE_URL`.

## Quick start (local dev)

```powershell
# 1. Install dependencies
npm install

# 2. Create .env (a .env.example is included; minimum shown)
#    DATABASE_URL=postgres://crosslinkd:cl_local_dev@127.0.0.1:5433/crosslinkd
#    AUTH_SECRET=any-long-random-string
#    ADMIN_SETUP_KEY=some-one-time-bootstrap-key
#    PUBLIC_SITE_URL=http://localhost:4321
#    SHOW_SAMPLE_CONTENT=1

# 3. Start the embedded local Postgres (first run downloads + initialises it)
node scripts/start-pg.mjs

# 4. Reset + migrate + seed the local database (separate terminal, while PG runs)
npm run db:reset

# 5. Start the app (third terminal)
npm run dev
```

Open http://localhost:4321.

> **Run these commands from the project root** — the folder that contains
> `package.json` (if you pasted the workspace inside an outer folder, `cd`
> into the inner one). On Windows everything works as-is; if Postgres ever
> fails to start, delete the `data` folder (`Remove-Item -Recurse -Force .\data`)
> and re-run `node scripts/start-pg.mjs` — it rebuilds the local database from
> scratch (a few seconds, no data loss: it only ever contains local dev data).

First super-admin: sign up any account, then either call `POST /api/admin/setup`
with `ADMIN_SETUP_KEY` or promote from the CLI:

```powershell
npm run admin:promote -- you@example.com
```

## Environment variables

| Var | Where required | Purpose |
|-----|----------------|---------|
| `DATABASE_URL` | local + prod | Pooled Postgres connection (Neon pooled URL in prod). |
| `DIRECT_URL` | CLI/migrations only | Unpooled URL for migrations. Never used by the app at runtime. |
| `AUTH_SECRET` | **always** | JWT signing secret. App **fails closed** (no sign-in) when unset. |
| `ADMIN_SETUP_KEY` | first-run only | One-time bootstrap for the first super-admin; endpoint 409s afterwards. |
| `PUBLIC_SITE_URL` | always | Canonical base URL for sitemap/mail links. |
| `SHOW_SAMPLE_CONTENT` | optional | `1` seeds sample listings into the public catalog (default off). |
| `CRON_SECRET` | prod | Protects `/api/cron/*`. Endpoints **fail closed (401)** when unset in production. |

## Industry taxonomy (new directory)

The job industry directory has been replaced with the new 8-top-level structure:

- **Food & Drink**: Restaurants (by cuisine), Bars, Bakeries & Desserts, Coffee & Tea, Grocery, Breweries & Wineries, Catering & Food Service
- **Health & Medical**: Doctors (by specialty), Dental, Mental Health, Pharmacies, Fitness & Wellness, Veterinary
- **Home Services**: Home Improvement, Cleaning, Landscaping, Automotive, Moving
- **Professional Services**: Legal, Financial, Real Estate, Marketing & Design, Education, Consulting
- **Shopping**: Clothing, Home & Garden, Electronics, Beauty & Personal Care, Sporting Goods, General Retail
- **Arts & Entertainment**: Nightlife, Museums & Galleries, Sports & Recreation, Events & Venues, Outdoor Activities
- **Travel & Lodging**: Hotels, Transportation, Tours & Attractions
- **Public Services**: Government, Religious, Community

Plus an additional **Other** category for custom entries. Defined in `src/data/industries.ts` and seeded into Postgres via `npm run db:reset`. All browse pages, search filters, listing creation/edit forms, admin taxonomy, and sitemap use this new structure.

## Location normalization (state & city)

City and state values are now **consistently normalized** across frontend, backend, API, DB, search, and admin:

- **State**: always stored as 2-letter abbreviation. Full names are converted case-insensitively: `California → CA`, `california → CA`, `New York → NY`, `texas → TX`, `CA → CA`. Invalid states are rejected with clear message: *“Invalid state. Use a U.S. state name or 2-letter abbreviation (e.g., CA, NY, TX).”*
- **City**: automatically converted to proper case: `fresno → Fresno`, `FRESNO → Fresno`, `san francisco → San Francisco`, `los angeles → Los Angeles`. Handles hyphens (`Winston-Salem`), apostrophes (`O'Fallon`), and special cases (`McAllen → McAllen`, `St. Louis → St. Louis`). Extra spaces are collapsed.

Implementation: `src/lib/location.ts` (`normalizeState`, `normalizeCity`, `US_STATES` list). Applied in:
- Zod validation (`src/lib/validation.ts`) — transforms + rejects invalid states
- DB workflow (`src/lib/submissions.ts`) — defense-in-depth normalization + duplicate check
- Search (`src/lib/search.ts`, `src/pages/api/search.ts`) — normalizes filters
- Forms (`src/pages/add-listing.astro`, `src/pages/dashboard/listings.astro`) — dropdown for state (abbreviation stored), blur + submit normalization for city, client-side validation
- Events (`src/pages/api/events.ts`) — city normalized
- Displays (`/browse/locations`, `/directory/[slug]`, dashboards) — show normalized values

Test examples from spec all pass (see `src/lib/location.ts`).

## Project layout (flat)

The repository root is the **only** root — the folder that contains
`package.json`. Everything lives one level below it:

```
Cross-Linkd/            ← project root (package.json here)
├── src/
│   ├── pages/            # routes: public site, /auth, /dashboard, /admin, /api
│   ├── layouts/          # Astro layouts
│   ├── lib/              # auth, guards, submissions, publicListings, ratelimit, location, …
│   ├── db/               # schema.ts, client.ts, migrate.ts, seed.ts
│   └── data/             # static content (articles, industries, …) — TRACKED by git
├── drizzle/              # numbered SQL migrations (0001…0004), applied with state tracking
├── scripts/              # start-pg, reset-local-db, admin-promote, sitemap, …
├── e2e-*.mjs             # 4 Playwright suites (256 checks)
├── data/db/              # ← GENERATED local Postgres cluster (git-ignored, deletable)
├── public/  dist/  .astro/   # assets + build output (generated/ignored)
├── astro.config.mjs  vercel.json  package.json  tsconfig.json  .env.example
├── CODE_REVIEW.md        # review + fix status
└── e2e-*.mjs
```

**What the old nested folder was:** the repo had previously been checked out inside
itself (`Cross-Linkd/Cross-Linkd/…`, and one copy had even grown its own
`data/db` cluster). The inner copy was redundant — the true project root is the
innermost folder containing `package.json`. If you still have the old nested
directories or an old `data` folder on your machine, they are safe to delete;
see the "Cleaning up after a code refresh" section below and
`scripts/cleanup-nested-folders.ps1`.

## The local `data/` folder

`data/db` is a **generated** embedded-Postgres cluster (tens of MB). It is:

- git-ignored (`/data/` in `.gitignore`),
- never needed for deployment,
- fully regenerable at any time:

```powershell
# delete it (safe — it only contains local dev/test data)
Remove-Item -Recurse -Force .\data\db

# and recreate it
node scripts/start-pg.mjs        # terminal 1 (keeps running)
npm run db:reset                 # terminal 2 → drop/create + migrate + seed
```

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server on `0.0.0.0:4321`. |
| `npm run build` / `npm run preview` | Production build / preview. |
| `npm run typecheck` | `astro check`. |
| `node scripts/start-pg.mjs` | Start embedded Postgres (port 5433, user `crosslinkd`/`cl_local_dev`). |
| `npm run db:reset` | **Local only** — drop/create DB, apply all migrations, seed taxonomy + samples. Refuses non-localhost hosts. |
| `npm run db:migrate` | Apply pending migrations (idempotent, state in `schema_migrations`). |
| `npm run db:seed` | Seed taxonomy/sample data. |
| `npm run admin:promote -- <email>` | Promote/revoke an account's role; bumps the session watermark. |
| `npm run e2e` | Layout suite (64 checks). |
| `npm run test:creation` | Listing-creation suite (60 checks). |
| `node e2e-multidenom-category.mjs` | Multi-denomination + category suite (72 checks). |
| `node e2e-auth.mjs` | Auth/admin/review-pipeline suite (60 checks). |

### Running the e2e suites

Each suite assumes a **freshly reset** local database (they query by listing
name):

```powershell
npm run db:reset        # do this before EACH suite
node e2e-layout.mjs
npm run db:reset
node e2e-listing-creation.mjs
npm run db:reset
node e2e-multidenom-category.mjs
npm run db:reset
node e2e-auth.mjs
```

All four are currently green: **256/256**.

## Deployment (Vercel)

1. Push the code; connect the repo in Vercel (framework: Astro, output: serverless
   via `@astrojs/vercel`).
2. Set the env vars from the table above (`DATABASE_URL` = Neon **pooled** URL,
   `DIRECT_URL` = Neon **direct** URL for migrations, a strong `AUTH_SECRET`,
   `PUBLIC_SITE_URL` = your production URL, `CRON_SECRET`).
3. Run migrations from a machine with `DIRECT_URL`:
   `npx tsx src/db/migrate.ts`
4. Optionally, point Vercel Cron at `/api/cron/search-index` and
   `/api/cron/refresh-sitemap` (both require the `CRON_SECRET` bearer).

Fail-closed behaviors to know about:

- No `AUTH_SECRET` → sign-in/sign-up/magic-link are disabled (503), never an
  insecure fallback.
- No `CRON_SECRET` in production → cron endpoints return 401.
- Mutating API requests (POST/PUT/PATCH/DELETE) are origin-verified: the
  `Origin` header must match the site host (Astro 7 also blocks cross-site
  form POSTs at the framework level).

## Cleaning up after a code refresh (PowerShell)

If you pasted this codebase over an older copy of the project, the old
*generated* and *redundant* items can be removed safely. Run from the **project
root** (the folder containing `package.json`):

```powershell
# 1. Stop the dev server (Ctrl+C in its terminal) and any local Postgres.

# 2. Delete redundant old copies (if present on your machine):
if (Test-Path ".\Cross-Linkd")   { Remove-Item -Recurse -Force ".\Cross-Linkd" }
if (Test-Path "..\crosslinkd")   { Remove-Item -Recurse -Force "..\crosslinkd" }

# 3. Delete the old generated local database (it regenerates in seconds):
if (Test-Path ".\data\db") { Remove-Item -Recurse -Force ".\data\db" }

# 4. Reinstall dependencies and rebuild the local DB:
npm install
node scripts/start-pg.mjs     # terminal 2 (keeps running)
npm run db:reset              # terminal 3
npm run dev                   # terminal 4
```

Or run the labeled helper (dry-run by default — it prints what it would delete):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\cleanup-nested-folders.ps1            # dry run
powershell -ExecutionPolicy Bypass -File .\scripts\cleanup-nested-folders.ps1 -Execute   # actually delete
```

Only **generated** artifacts are ever removed (`data/db`, nested duplicate
copies, `node_modules` with `-IncludeNodeModules`). Source, git history,
`.env` files, and production data (your Neon DB) are never touched.
