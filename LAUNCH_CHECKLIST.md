# CrossLinkd — Public Release Checklist

Status baseline: e2e-auth 43/43 · e2e-layout 64/64 · astro check 0 errors · production build green · security headers + cron config in `vercel.json` · deployment guide in `DEPLOY.md`.
Nothing is deployed yet — the app itself is release-ready code, but release **operations** haven't been executed.

---

## BLOCKERS — must be done before public launch

| # | Item | Why it blocks | Fix | Effort |
|---|------|---------------|-----|--------|
| ~~B1~~ | **RESOLVED — bundled sample business listings removed from source, database seeding, search, directory lookup, autocomplete, and exports.** No demo flag can add sample businesses; the directory starts empty until real listings are published. Illustrative events/testimonials remain separately gated for local previews. | A trust directory must not present fabricated businesses as real. | Removed the listing corpus and all runtime/seed paths that exposed it; kept the `SHOW_SAMPLE_CONTENT` gate only for non-listing demo content. | Complete |
| ~~B2~~ | **RESOLVED — autocomplete now serves the live public corpus.** Was: sample-only suggestions. | Broken/misleading search UX on the core feature. | Wire autocomplete to the same merged corpus as search (pass DB listings as `extra`). | ~1 h |
| B3 | **Deployment has not been executed.** No Vercel project, no production database, no env vars, no domain. | Nothing to release. | Follow `DEPLOY.md`: Vercel project → Neon Postgres → env vars → `db:migrate` + `db:seed` (taxonomy only) → custom domain → set `PUBLIC_SITE_URL`/`site` to it → first admin (CLI promote or `ADMIN_SETUP_KEY` flow, which self-disables once a super-admin exists). | ~2–4 h |
| B4 | **Transactional email is not configured.** Without `RESEND_API_KEY` (+ verified sending domain, SPF/DKIM), verification and password-reset links only print to server logs. | Public users cannot verify accounts or reset passwords. | Resend account + domain verification; set `RESEND_API_KEY`, `MAIL_FROM`. | ~1 h |
| B5 | **No global rate limiting on public/auth endpoints.** Handlers have in-memory throttles, but on Vercel each serverless instance has its own counters; limits reset on cold starts and are not an effective global cap. | Attackers can spread requests across instances or restarts (credential stuffing, form spam). | Configure Vercel Firewall / WAF rules on `/api/auth/*`, `/api/listings`, `/api/reviews`, `/api/contact`, `/api/claims`; alternatively use shared storage such as `@upstash/ratelimit`. Consider Turnstile on public forms. | 2–4 h |
| B6 | **Feedback inbox + fresh secrets.** `CONTACT_INBOX` is used for feedback-suggestion emails; contact-form messages are saved in the admin reports inbox, not emailed. `AUTH_SECRET`/`ADMIN_SETUP_KEY` must be newly generated values, never the local test ones. | Misdirected feedback email; session-forgery/secret reuse risk. | Set `CONTACT_INBOX` for feedback suggestions; generate 32-byte secrets in Vercel. | minutes |

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
