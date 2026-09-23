# CrossLinkd — deployment & operations

## Stack
| Concern | Service |
|---|---|
| Hosting | **Vercel** (Astro 7, `@astrojs/vercel`, Node 22 — set `NODE_VERSION=22`) |
| Database | **Postgres on Neon** via the `postgres.js` driver + Drizzle ORM (`DATABASE_URL` = Neon **pooled** URL) |
| Auth | First-party sessions: bcrypt password hashes + signed JWT in an httpOnly cookie (`jose`, `AUTH_SECRET`) |
| Email | Resend REST API (`RESEND_API_KEY`); falls back to server-side logs when unset |

## Required environment variables (Vercel → Project → Settings → Environment Variables)
| Key | Purpose |
|---|---|
| `DATABASE_URL` | Runtime Postgres (Neon **pooled** string) |
| `DIRECT_URL` | Unpooled string for `npm run db:migrate` and admin CLI |
| `AUTH_SECRET` | Session signing key — generate with `openssl rand -hex 32` |
| `PUBLIC_SITE_URL` | e.g. `https://crosslinkd.com` — used in emails/links |
| `CRON_SECRET` | Bearer token Vercel Cron sends to `/api/cron/*` |
| `RESEND_API_KEY` | Email delivery (magic links, verification, resets, contact form) |
| `MAIL_FROM` | e.g. `CrossLinkd <mail@your-domain>` |
| `ADMIN_SETUP_KEY` | Optional: enables the one-time `/admin/setup` bootstrap; remove after use |
| `CONTACT_INBOX` | Optional: where contact-form mail lands |

## Database schema
```bash
DATABASE_URL=… DIRECT_URL=… npm run db:migrate     # applies drizzle/*.sql in order
DATABASE_URL=… npm run db:seed -- --taxonomy       # optional: seed industries/denominations/types
```
`db:seed` without `--taxonomy` also copies the bundled sample listings into the DB as published rows — use it only for demo deployments.

## First administrator (choose one)
1. **CLI (recommended):** register through the normal sign-up page, then
   `DATABASE_URL=… DIRECT_URL=… npm run admin:promote -- you@example.com`
   (`--revoke` demotes back to member; `--list` shows current staff).
2. **Setup key:** set `ADMIN_SETUP_KEY`, sign up, visit `/admin/setup`, enter the key.
   The endpoint is permanently disabled once any super admin exists. No credentials are ever sent or accepted here — only the key vs. server env comparison, timing-safe.

Role changes take effect on the user's **next sign-in** (roles ride the session token).

## Admin console
`/admin` — overview · `/admin/listings` — moderation queue (approve / request changes / reject / delete, note to owner) · `/admin/users` — role management (super admin only) · plus analytics, claims, reports, reviews, taxonomy, verifications.
All admin pages and `/api/admin/*` endpoints enforce the role **server-side**; signed-out users are redirected to sign-in, non-admins get 403.

## Listing workflow
`Draft → Pending Review → Approved (published)` with `Rejected` / `Changes Requested` branches (owner revises & resubmits).
Approved listings become publicly visible on search/detail/city/state pages; nothing else is ever rendered publicly. Owners see reviewer notes on their dashboard and can only ever read/write their own rows.

## Post-deploy verification
1. Sign up two accounts (A, B). Verify A's email via the emailed link (or server log when `RESEND_API_KEY` is unset).
2. As A: dashboard → submit a business. Confirm it is **not** visible on `/search` while pending.
3. Promote an admin, sign in, open `/admin/listings` → Approve the listing → confirm it now appears on `/search` and its detail page.
4. Reject a second listing with a note → A sees the note and "Revise & resubmit".
5. Negative checks: signed-out `/admin` → redirected; signed-in non-admin `/admin` → 403; B opening A's listing edit API → 404; `/api/admin/users/<id>/role` as non-super-admin → 403.

## Sample content (demo listings/events)
The bundled curated listings and events are **demo data and are hidden by default** — a fresh deployment shows an empty directory, not fake businesses. For local demos/tests set `SHOW_SAMPLE_CONTENT=1` in the environment (or `.env`). Never enable it in production. To wipe submitted listings at any time: `npm run db:wipe-listings` (keeps users and taxonomy).

## Preview-data sections
Secondary console pages (admin: analytics, claims, reports, reviews, taxonomy, verifications; dashboard: analytics, events, reviews, verification) are gated like everything else but currently render clearly labeled **illustrative sample content** ("Preview data" banner). No fake numbers are presented as live metrics. Core flows (listing queue, users/roles, moderation, owner lifecycle) are fully live against the database.

## Automated end-to-end test (optional, local)
With a local Postgres + dev server running (`.env` pointing at it, `AUTH_SECRET`/`ADMIN_SETUP_KEY` set):

```
node e2e-auth.mjs
```

43 checks: signup → email verify → draft → submit → duplicate/incomplete/unauth negatives → CLI promote → admin approve/reject/request-changes → resubmit → public visibility flips → role/permission negatives → revocation semantics → mobile smoke.
