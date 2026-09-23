# CrossLinkd — Public Release Checklist

Status baseline: e2e-auth 43/43 · e2e-layout 64/64 · astro check 0 errors · production build green · security headers + cron config in `vercel.json` · deployment guide in `DEPLOY.md`.
Nothing is deployed yet — the app itself is release-ready code, but release **operations** haven't been executed.

---

## BLOCKERS — must be done before public launch

| # | Item | Why it blocks | Fix | Effort |
|---|------|---------------|-----|--------|
| ~~B1~~ | **RESOLVED — samples now env-gated (`SHOW_SAMPLE_CONTENT`, default off) across search/directory/browse/homepage/events/sitemap/exports.** Was: curated sample listings rendered on every public surface in prod.  `searchListings` always merges `SAMPLE_LISTINGS` into the pool; directory/locations/states/sitemap merge via `getPublicListings`; `/events` is sample-driven. | A trust directory launching with ~48 fabricated businesses (and fake events) is a credibility and content-integrity failure — worse than an empty directory. | Introduce one gate (e.g. `includeSamples()` helper keyed on `SHOW_SAMPLE_CONTENT` env, default off in prod) applied in `searchListings`, `getPublicListings`, sitemap, events pages, and autocomplete. Local dev/E2E sets the flag. | ~2 h + E2E env note |
| ~~B2~~ | **RESOLVED — autocomplete now serves the live public corpus.** Was: sample-only suggestions. | Broken/misleading search UX on the core feature. | Wire autocomplete to the same merged corpus as search (pass DB listings as `extra`). | ~1 h |
| B3 | **Deployment has not been executed.** No Vercel project, no production database, no env vars, no domain. | Nothing to release. | Follow `DEPLOY.md`: Vercel project → Neon Postgres → env vars → `db:migrate` + `SEED_TAXONOMY_ONLY=1` seed → custom domain → set `PUBLIC_SITE_URL`/`site` to it → first admin (CLI promote or `ADMIN_SETUP_KEY` flow, which self-disables once a super-admin exists). | ~2–4 h |
| B4 | **Transactional email is not configured.** Without `RESEND_API_KEY` (+ verified sending domain, SPF/DKIM), verification and password-reset links only print to server logs. | Public users cannot verify accounts or reset passwords. | Resend account + domain verification; set `RESEND_API_KEY`, `MAIL_FROM`. | ~1 h |
| B5 | **No rate limiting or spam protection on public/auth endpoints** (signup, signin, reset, contact, public suggestion form). None exists today. | Public internet will find and abuse these (credential stuffing, form spam). | Minimum: Vercel Firewall / WAF rules on `/api/auth/*` + `/api/listings` + `/api/contact`. Better: `@upstash/ratelimit` per-IP in the handlers; optional Cloudflare Turnstile on public forms. | 2–4 h |
| B6 | **Real inbox + fresh secrets.** `CONTACT_INBOX` defaults to `support@crosslinkd.example.com`; `AUTH_SECRET`/`ADMIN_SETUP_KEY` must be newly generated values, never the local test ones. | Misdirected contact mail; session-forgery/secret reuse risk. | Set `CONTACT_INBOX`; generate 32-byte secrets in Vercel. | minutes |

## MUST-DECIDE (launch-shape choices, not code)

- **Launch content:** the production DB ships empty (taxonomy only). Either onboard founding listings through the real submission flow before announcing, or position as early-access. An empty-but-honest directory is fine; a fake-looking one is not (covered by B1).
- **Illustrative console pages (10):** admin analytics/claims/reports/reviews/taxonomy/verifications + dashboard analytics/events/reviews/verification show clearly labeled "Preview data". Acceptable to ship labeled (admin-only); alternatively hide those nav entries at launch. Either is fine — just decide.
- **Events section:** sample events fall under B1's gate; if gated off, either hide `/events` at launch or source real events.

## NICE-TO-HAVE (post-launch polish)

1. **A11y audit pass** — keyboard/dropdown/reduced-motion/aria already tested; do a full sweep (heading order, skip-link, AA contrast, form-error announcements) with axe/Lighthouse.
2. **Performance pass** — self-host Google Sans/Roboto (currently Google Fonts CDN with `display=swap`), preload headings font, run Lighthouse on key pages. Placeholder-card images are already cheap (CSS hues).
3. **Cron cleanup** — `/api/cron/*` are auth-guarded pings; the sitemap is generated on-request, so the daily ping is vestigial. Disable or make them meaningful (saves quota).
4. **Error tracking + uptime** — Sentry (or similar) + an uptime monitor on `/` and `/api/auth/signin`.
5. **Real analytics** — Vercel Web Analytics flag is already on; wire the admin analytics page to real data eventually.
6. **Data resilience** — enable Neon point-in-time restore/backups.
7. **Paused feature** — industry-taxonomy component removable chips (standing pause; not launch-relevant).
8. **Legal review** — Terms/Privacy/Guidelines pages exist; a human review pass is prudent. Only essential cookies are set, so no consent banner should be needed (confirm with reviewer).
9. **Manual device pass** — responsive behavior is e2e-smoke-tested on desktop/tablet/mobile; a quick real-device sanity sweep is cheap insurance.

## ALREADY DONE (no action)

Accounts + verification + password reset (reset verified live end-to-end) · owner draft/submit/edit/status lifecycle with exact `Draft / Pending Review / Approved / Rejected` labels · duplicates (409) + completeness (400) validation · server-side admin gating on all 12+ pages and every API (redirect/403/404 semantics tested) · approve/reject/request-changes/edit/delete + audit log · user/role management with self-change blocked, revoke-on-relogin semantics · two first-admin flows, no hardcoded creds · CSRF `checkOrigin`, security headers, no secrets in repo · dynamic sitemap/robots on the deployment origin · empty/error/success states · 107 automated checks green.

**Recommended order:** B1 → B2 → B5 → B3 → B4/B6 → soft-launch smoke (DEPLOY.md § Post-deploy verification) → announce.
