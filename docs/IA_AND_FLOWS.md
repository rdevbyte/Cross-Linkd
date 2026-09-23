# Information Architecture & User Flows

## Sitemap (MVP)

```
/
├── /search (filters, sort, list/map, pagination)
├── /directory/[slug] (type-specific profiles)
├── /browse/industries|professions|denominations|locations
├── /industries/[slug] /professions/[slug] /denominations/[slug] /locations/[slug]
├── /events /events/[slug]
├── /add-listing /claim-listing /pricing
├── /favorites (device ASK → account sync in prod)
├── /auth/signin|signup|reset
├── /dashboard (overview|listings|reviews|verification|analytics|events)
├── /admin (overview|listings|verifications|claims|reviews|reports|taxonomy|users|analytics)
├── /about /trust /help /contact /terms /privacy /guidelines /reviews-policy /appeals /copyright
├── /sitemap.xml /robots.txt
└── /api/* (search, suggest, listings, claims, reviews, verifications, events, auth, admin, cron)
```

## Flow 1 — Seeker discovers (“bakery #Baptist”)

1. Lands on `/` → sees John 14:6 verse, hero search.
2. Types `bakery #Bap` → hashtag autocomplete suggests `#Baptist` → selects → chip appears.
3. Hits Search → `/search?q=…` → relevance-ranked cards + applied-tag display.
4. Refines: Verified only ✓, radius 10 mi, sort by rating → opens profile.
5. Profile: badges, hours, statement of faith, reviews → ♥ Save, ↗ Share/QR, 📞 Call.

## Flow 2 — Owner lists + verifies

1. `/add-listing` → submits (guest or signed-in) → `pending_review`.
2. Moderator approves → published → owner claims (if guest) via `/claim-listing` with evidence.
3. `/dashboard/verification` → submits badge evidence → reviewer approves → badge live.
4. Manages: edit info, add events, respond to reviews, view analytics, export CSV.

## Flow 3 — Moderator keeps trust

1. `/admin` queue → opens listing/claim/verification/review/report.
2. Acts: approve / request evidence / suspend / merge duplicate — every action audit-logged.
3. Reporter/appellant notified; appeals go to a *different* reviewer (`/appeals` process).

## Flow 4 — Event discovery

`/events` → filter by category → event page → Add-to-calendar (.ics) → organizer profile → follow (prod).

## Navigation model

Sticky header: logo · Industries · Professions · Denominations · Locations · Events · Search · Claim · +Add · Sign in/Dashboard · theme. Mobile: same via disclosure menu. Footer: Discover/Listings/Community/Legal + non-endorsement notice.
