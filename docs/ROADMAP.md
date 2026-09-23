# Roadmap — MVP → Beyond

## MVP (this release) — ✅ implemented

1. ✅ Homepage (all specified sections + John 14:6)
2. ✅ Auth (email/password, sessions, roles; magic-link/reset stubs)
3. ✅ Search + autocomplete (FTS SQL path + memory fallback)
4. ✅ Hashtag filtering (detect/suggest/chips/multi-tag)
5. ✅ Industry/profession/denomination/location filters
6. ✅ Listing profiles (type-specific templates)
7. ✅ Business/church/ministry/professional (+14 more types)
8. ✅ SQL database (normalized schema, migrations, seed)
9. ✅ Listing creation + editing
10. ✅ Claim workflow
11. ✅ Basic verification (badges, evidence, review queue)
12. ✅ Admin moderation (queues, taxonomy, users, reports, exports)
13. ✅ Favorites (+ collections schema/API-ready)
14. ✅ Map search (Leaflet, near-me, radius, split view)
15. ✅ Light + charcoal dark themes (persisted, system-aware)
16. ✅ Responsive (mobile/tablet/desktop)
17. ✅ SEO-ready (schema, sitemap, robots, canonical)
18. ✅ Vercel deployment config (adapter, headers, crons, runbook)

## Phase 1.1 — hardening (next)

- Resend email (verification, magic links, notifications) + Vercel Blob uploads
- Turnstile on public forms + Vercel Firewall rate limits
- Sentry + PostHog; `noindex` on thin search combos; OG image rendering
- Suggest-an-edit queue UI; duplicate auto-merge tooling; saved searches UI

## Phase 2 — growth

- Stripe: enhanced listings, featured placement (labeled), multi-location plans, church/ministry pricing
- Event registration + add-to-calendar sync; announcements → follower notifications
- Advanced reviews (dimension ratings live, verified-interaction proof, appeals UI)
- Public API v1 + webhooks; owner analytics+ (heatmaps, benchmarks)
- Meilisearch/Typesense cutover (delta sync via existing cron); PostGIS radius

## Phase 3 — platform

- Mobile apps (shared API); multi-language (ES first); AI-assisted search (guardrailed, opt-in)
- Automated verification (license APIs, domain DNS checks); collections sharing; messaging (moderated, Phase 3+)
