# 🚀 Vercel Deployment Runbook — CrossLinkd

Production deployment in 10 steps. Estimated time: ~45 minutes (plus DNS propagation).

## Prerequisites

- GitHub/GitLab repo with this project
- Vercel account (Hobby OK for MVP; Pro recommended for cron + analytics scale)
- A Postgres provider: **Neon** (recommended), Supabase, or Vercel Postgres

## 1. Create the Vercel project

1. Push this repo to GitHub.
2. Vercel Dashboard → **Add New → Project → Import** the repo.
3. Framework preset: **Astro**. Root: `crosslinkd/` if monorepo (or repo root).
4. Build command: `npm run build` · Output: `dist` (already in `vercel.json`).

## 2. Connect the Git repository

- Connect the `main` branch for production; every PR gets a **preview deployment** automatically.
- Recommended: require preview PASS + `astro check` before merging (Vercel → Git → Deployment Protection).

## 3. Create the PostgreSQL database

**Neon (recommended for serverless):**
1. Create project → copy the **pooled** connection string (`...-pooler...`) → `DATABASE_URL`.
2. Copy the **direct** string → `DIRECT_URL`.
3. Enable **PgBouncer / pooling** (default on Neon pooled URLs).

**Supabase:** Project Settings → Database → use **Connection Pooling (Supavisor)** URL for `DATABASE_URL`, direct for `DIRECT_URL`. Enable `pg_trgm` + `pgcrypto` extensions (SQL editor) — the migration also attempts this.

## 4. Add environment variables

Vercel → Project → **Settings → Environment Variables**. Add for **Production** (+ Preview as needed):

| Key | Value |
|---|---|
| `DATABASE_URL` | Pooled Postgres URL (**required**) |
| `DIRECT_URL` | Direct Postgres URL (**required** for migrations) |
| `AUTH_SECRET` | `openssl rand -base64 32` (**required**, 32+ bytes) |
| `PUBLIC_SITE_URL` | `https://yourdomain.com` (**required**) |
| `CRON_SECRET` | `openssl rand -base64 32` (recommended) |
| `RESEND_API_KEY` + `EMAIL_FROM` | For verification/magic-link emails |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob for listing photos/docs |
| `MAPBOX_TOKEN` | Optional premium tiles/geocoding |
| `TURNSTILE_SECRET_KEY` + `PUBLIC_TURNSTILE_SITE_KEY` | Bot protection on forms |
| `SENTRY_DSN` | Error monitoring |

See [.env.example](./.env.example) for the full documented list. Never commit real secrets.

## 5. Run database migrations

```bash
# Locally (uses DIRECT_URL — unpooled):
DATABASE_URL="<pooled>" DIRECT_URL="<direct>" npm run db:generate
DATABASE_URL="<pooled>" DIRECT_URL="<direct>" npm run db:migrate
```

This creates all tables from `src/db/schema.ts` plus the FTS/trigram indexes in `drizzle/0001_init.sql`. Verify: `SELECT count(*) FROM listings;` should work (empty until seed).

## 6. Seed the initial taxonomy

```bash
DATABASE_URL="<pooled>" npm run db:seed
```

Loads: 18 listing types, 17 industries (+ categories/professions), 17 traditions + 30+ denominations + aliases, hashtag catalog, event categories, 48 sample listings (5 focus states, 6 metros). Re-run safely (idempotent via `onConflictDoNothing`).

Create the first admin (SQL):

```sql
UPDATE users SET role = 'super_admin' WHERE email = 'you@example.com';
```

## 7. Deploy the application

- `git push main` → Vercel auto-deploys, or **Deployments → Redeploy**.
- First deploy: confirm build log shows `astro build` success and serverless functions bundled.
- Smoke test: `/`, `/search?q=bakery+%23Baptist`, `/directory/grace-and-grain-bakery`, `/sitemap.xml`, theme toggle, sign-up → dashboard, `/admin` (as admin).

## 8. Configure a custom domain

1. Vercel → Project → **Settings → Domains** → add `crosslinkd.com` (+ `www` redirect).
2. Add the DNS records at your registrar (A `76.76.21.21` or CNAME `cname.vercel-dns.com`).
3. Update `PUBLIC_SITE_URL` to the final domain and redeploy (fixes canonical URLs + sitemap + OG).
4. Update `public/robots.txt` sitemap URL.

## 9. Configure storage and email

- **Storage:** Vercel → **Storage → Blob** → connect → copy `BLOB_READ_WRITE_TOKEN`. Listing photo uploads + verification docs target Blob (S3-compatible path also supported via `S3_*`).
- **Email:** Resend → verify domain → `RESEND_API_KEY` + `EMAIL_FROM="CrossLinkd <hello@yourdomain.com>"`. Enables: email verification, magic links, password resets, claim/reported notifications.
- **Turnstile:** Cloudflare → add site → paste keys → enable on `/add-listing`, `/claim-listing`, review forms (widget snippet in Phase 1.1 hardening).

## 10. Monitor errors and performance

- **Vercel Analytics + Speed Insights:** enabled via adapter (`webAnalytics: true`); confirm in dashboard.
- **Logs:** Vercel → Deployments → Runtime Logs (filter `/api/*` errors). Structured `console.error('[api/...]')` markers are greppable.
- **Crons:** `vercel.json` schedules `/api/cron/refresh-sitemap` (nightly) and `/api/cron/search-index` (30 min). Set `CRON_SECRET` and confirm Cron runs in dashboard.
- **Sentry (optional):** add `SENTRY_DSN`, install `@sentry/astro`, confirm first-issue alert.
- **Uptime:** add a check on `/api/cron/search-index` or homepage (e.g., Better Stack).

## Rollback & migrations

- Rollback: Vercel → Deployments → **Promote** previous production deployment (instant).
- DB changes: additive-first (new nullable columns/tables). Generate migration, review SQL, apply to a **Neon branch** (preview), then production via `db:migrate`.

## Go-live checklist

- [ ] `PUBLIC_SITE_URL` = final domain; redeployed
- [ ] Sitemap submitted to Search Console; robots.txt correct
- [ ] Admin account created; test claim + verification + review flows
- [ ] Email deliverability tested (verification + reset)
- [ ] Storage uploads tested (logo/cover/document)
- [ ] Lighthouse ≥ 90 (mobile + desktop), keyboard pass, reduced-motion pass
- [ ] Legal pages reviewed by counsel (Terms, Privacy, Guidelines)
