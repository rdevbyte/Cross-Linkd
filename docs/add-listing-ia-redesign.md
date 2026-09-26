# Add Listing — Information Architecture & User Flow Redesign

## 1. Analysis of Current Usability Issues

### Current Structure
- **Field 1: Listing Type** (segmented cards): Business, Church, Ministry, Nonprofit, School, Event, Other
- **Field 2: Category** (primary + secondary): Industry-based taxonomy — Food & Drink, Health & Medical, Home Services, Professional Services, Shopping, Arts & Entertainment, Travel & Lodging, Public Services, Other
- **Fields are independent** — no filtering, no dependency, no explanation of relationship

### Core Mismatch
The taxonomy conflates **entity type** (what the organization *is*) with **industry** (what it *does*). This creates impossible combinations:

- **Church** + `Medical Office` / `Restaurant` / `Auto Mechanic`
- **School** + `Bars` / `Nightlife` / `Hotels`
- **Event** + `Dental` / `Pharmacies` / `Veterinary`
- **Business** + `Religious > Pastor` (should be Church)

Users must mentally reconcile two unrelated axes. Cognitive load is high, error rate is high, data quality suffers.

### Specific Usability Problems

1. **Unclear mental model**: Is "Listing Type" the same as "Category"? Users see two required classification fields with overlapping language (e.g., `Business` type vs `Professional Services > Consulting` category). No hierarchy is communicated.

2. **No progressive disclosure**: All 40+ categories shown regardless of type. A pastor searching for "Youth Ministry" sees "Bakeries & Desserts" and "Auto Detailer" — irrelevant noise.

3. **Terminology is technical**: "Listing Type" and "Primary category" sound like database fields, not user goals. "Industry" is business jargon that doesn't fit churches or events.

4. **Validation gaps**: System allows Church + Restaurant to be saved. No guardrail prevents mismatched data from entering directory, hurting search/browse and trust.

5. **Search/browse downstream impact**: Browse pages filter by industry. If churches are tagged as restaurants, they pollute business search results and are invisible in church-specific browsing.

6. **Completion confusion**: Progress bar counts "Category" as complete even when category is irrelevant to type, giving false sense of correctness.

7. **Scalability issue**: Adding new types (e.g., Podcast, Camp) requires adding more industry categories that further dilute relevance unless filtering exists.

---

## 2. Recommended Changes to Page Structure & Terminology

### Decision: Keep, Rename, and Restructure — Do NOT Remove

**Remove would lose important signal**: Churches, schools, and events have fundamentally different profile needs (service times vs business hours vs event dates). Removing type would force everything into industry buckets, which is worse.

**Recommendation: Rename and make Type the primary driver**

| Current | Recommended | Why |
|---------|-------------|-----|
| Listing Type * | **What best describes you? *** | User-centered, question format, clearer than technical "type" |
| Primary category * | **Category *** (dynamic label) | Label changes based on type: for Business = "Industry & Category", for Church = "Church Focus", for School = "Education Level", for Event = "Event Type", for Ministry = "Ministry Focus", for Nonprofit = "Cause Area" |
| Secondary category (optional) | **Additional category (optional)** | Less jargon, consistent |
| Organization Basics | **About your listing** | Matches "Listing name" terminology, warmer |

### New IA — Type-Driven Conditional Categories

**Principle**: Type is selected FIRST and filters Category options to only relevant industries/categories. This is progressive disclosure with a clear hierarchy: Type → Category → Details.

**Mapping (implemented in code)**:

```ts
const TYPE_CATEGORY_MAP = {
  business: ['food-drink', 'health-medical', 'home-services', 'professional-services', 'shopping', 'arts-entertainment', 'travel-lodging', 'other-industries'],
  church: ['public-services'], // filtered to religious + community
  ministry: ['public-services'],
  nonprofit: ['public-services', 'other-industries'],
  school: ['professional-services'], // filtered to education only
  event: ['arts-entertainment', 'travel-lodging', 'other-industries'],
  other: all industries
}

const TYPE_CATEGORY_FILTER = {
  church: { 'public-services': ['religious', 'community'] },
  ministry: { 'public-services': ['religious', 'community'] },
  nonprofit: { 'public-services': ['community', 'government'] },
  school: { 'professional-services': ['education'] },
  event: { 
    'arts-entertainment': ['events-venues', 'outdoor-activities', 'sports-recreation', 'museums-galleries', 'nightlife'],
    'travel-lodging': ['tours-attractions'],
    'other-industries': ['other-business']
  }
}
```

**Behavior**:
- On type select, primary category dropdown rebuilds with only relevant optgroups/options
- If previously selected category becomes incompatible, clear it and show inline warning: "Category cleared — it doesn't match the new organization type"
- Secondary category follows same filter
- Helper text updates: "Showing categories for Churches" / "Showing industries for Businesses"

### Terminology Updates

- **Listing name *** (already done) — keep, consistent in preview ("Your listing name")
- **What best describes you? *** — 7 cards with improved descriptions:
  - Business: "Christian-owned company, shop, or service provider"
  - Church: "Local congregation — Sunday services, small groups, pastoral care"
  - Ministry: "Parachurch outreach, missions, discipleship, media ministry"
  - Nonprofit: "Faith-based charity, foundation, or community organization"
  - School: "Christian school, college, seminary, or homeschool co-op"
  - Event: "Conference, retreat, concert, camp, or gathering (one-time or recurring)"
  - Other: "Association, network, or other faith-aligned organization"
- **Category *** — dynamic placeholder:
  - Business: "Select a primary industry"
  - Church: "Select church focus"
  - Ministry: "Select ministry focus"
  - Nonprofit: "Select cause area"
  - School: "Select education level"
  - Event: "Select event type"
  - Other: "Select a primary category"
- **Online-only toggle** — keep with On/Off, but add context: "For churches: online services only. For events: virtual event. For businesses: nationwide service."

### Page Structure (Revised)

1. **About your listing** (was Organization Basics)
   - Listing name *, What best describes you? *, Tagline, Description *, Logo

2. **Category & Focus** (was Category) — **conditional**
   - Primary category * (dropdown filtered by type) + validation message
   - Secondary optional (same filter)
   - Custom category when Other
   - Inline help: "Categories shown are tailored to [Type]"

3. **Faith Identity** — unchanged, but add type-aware helper: For churches, show "Denomination is especially important for churches"

4. **Location & Presence**
   - Online-only toggle (On/Off) with explanation
   - Location fields (#location-fields) hidden when online-only
   - For Events: show additional date/venue fields (future enhancement)
   - For Schools: show campus count (future)

5. **Contact & Visibility** — unchanged

6. **Preview & Publish** — sticky bar, preview shows type-aware location ("Online-only • Serves nationwide" vs "Austin, TX")

---

## 3. Revised User Flow for Adding a Listing

### Current Flow (Confusing)
1. User enters Listing name
2. User picks Listing Type (e.g., Church) — no feedback
3. User sees ALL 40+ industry categories, picks Restaurant (mismatch, but allowed)
4. User fills faith, location, contact
5. Publishes — data is polluted, search broken

### Proposed Flow (Type-Driven)

```
[Header: 0 of 4 complete + progress bar]

Step 1: About your listing
- Enter Listing name* → live preview updates initial + name
- Select Organization Type* (card) → 
  - Triggers: rebuild Category dropdown, update helper text, update preview type badge
  - Completion: 1 of 4 if name+type+desc≥10
- Enter Tagline, Description*, Logo

Step 2: Category & Focus (appears only after type selected, or disabled until then)
- System shows: "Showing categories for [Churches]" + count
- Primary Category* dropdown (filtered) → 
  - If Other selected → show Custom category input (required)
  - Show chip with selected value (visible selected state)
  - Button "+ Add additional category" appears after primary selected
- Secondary optional (filtered) → chip removable
- Validation: if empty on Publish attempt, show #primary-category-error and scroll to field
- Completion: 2 of 4 when primary selected

Step 3: Faith Identity
- Denomination type-ahead (up to 3) — first = Primary
- Statement of Faith textarea
- Helper: for Churches, emphasize denomination importance

Step 4: Location & Presence
- Online-only toggle (Off/On) beside label
  - Off (default): show City, State, Postal + helper about proper-case formatting
  - On: hide #location-fields, show #location-disabled-note "Physical address not required... nationwide"
  - Preview location updates to "Online-only • Serves nationwide"
- Contact: Website, Phone, Email (pre-filled)
- Visibility toggles (Show phone/email/etc)

Step 5: Publish
- Sticky bar shows "X of 4 complete" + Save draft / Publish listing (primary accent brass)
- On Publish: normalize city (San Francisco), state to abbreviation (CA), validate state, validate category required unless draft
- Draft: allows empty category, saves via API, redirects to success
- Publish: requires category, shows inline errors if missing
```

**Key Improvements**:
- Type selected early, filters next step — prevents mismatch at source
- No impossible combinations can be submitted
- User sees only 5-12 relevant categories instead of 40+ — faster, less error
- Clear feedback loop: type → filtered categories → preview
- Online-only toggle reduces friction for virtual entities

---

## 4. Examples of Appropriate Listing Types and Categories

### Business (Christian-owned company, shop, service provider)
- **Type**: Business
- **Primary Categories** (filtered to business industries):
  - Food & Drink > Bakeries & Desserts — *Harvest & Hearth Bakery*
  - Health & Medical > Dental — *Grace Dental — Christian Family Dentistry*
  - Home Services > Home Improvement > Plumber (licensed) — *Living Water Plumbing*
  - Professional Services > Legal > Attorney — *Covenant Law — Estate Planning*
  - Professional Services > Financial > CPA — *Kingdom Accounting*
  - Shopping > Beauty & Personal Care > Hairstylist — *Crown & Glory Salon*
  - Arts & Entertainment > Events & Venues > Event Planner — *Abide Events*
- **Secondary**: e.g., Professional Services > Marketing & Design

### Church (Local congregation)
- **Type**: Church
- **Primary Categories** (filtered to Public Services):
  - Public Services > Religious > Church (Contemporary) — *Grace Community Church*
  - Public Services > Religious > House Church — *The Table House Church*
  - Public Services > Community > Community Leader (for church plant network)
- **Attributes** (future): Service Style (Contemporary/Traditional/Liturgical), Size (Under 100, 100-300, etc.), Programs (Youth, Children, Small Groups)
- **Example**: Listing name "Grace Community Church", Type Church, Category Religious > Church, Denomination Non-denominational, City Austin, TX

### Ministry (Parachurch, outreach, missions)
- **Type**: Ministry
- **Primary**:
  - Public Services > Religious > Ministry Leader — *Young Life Austin*
  - Public Services > Community > Outreach Leader — *Street Hope — Homeless Outreach*
  - Public Services > Religious > Christian Broadcaster — *Redeemed Podcast Network*
- **Focus**: Youth Discipleship, Evangelism, Missions, Counseling

### Nonprofit (Faith-based charity)
- **Type**: Nonprofit
- **Primary**:
  - Public Services > Community > Nonprofit Director — *Hope House — Foster & Adoption*
  - Public Services > Community > Volunteer Coordinator — *Serve the City*
- **Cause Areas**: Poverty Alleviation, Homelessness, Education, Adoption/Foster, Pro-life, Clean Water

### School (Christian education)
- **Type**: School
- **Primary** (filtered to Education only):
  - Professional Services > Education > Private School Educator — *Covenant Christian Academy K-12*
  - Professional Services > Education > Private School Educator — *Austin Seminary*
  - Professional Services > Education > Tutor / Music Teacher — *Veritas Homeschool Co-op*
- **Levels**: Preschool, Elementary, Middle, High, K-12, College, Seminary, Homeschool Co-op, Tutoring

### Event (Gathering)
- **Type**: Event
- **Primary** (filtered to events):
  - Arts & Entertainment > Events & Venues > Event Planner — *Thrive Women's Conference 2026*
  - Arts & Entertainment > Outdoor Activities > Adventure Guide — *Wilderness Men's Retreat*
  - Travel & Lodging > Tours & Attractions > Tour Guide — *Holy Land Study Tour*
- **Attributes**: Date(s), Frequency (One-time, Annual, Weekly), Venue type (In-person, Online, Hybrid), Audience (Men, Women, Youth, Families)

### Other (Association, network)
- **Type**: Other
- **Primary**: Other > Other Business or Service + custom "Christian Business Network of Austin"

---

## 5. Edge Cases & Scalability Considerations

### Hybrid Organizations
- **Problem**: Church that runs a K-12 school, business that is also a ministry (e.g., Christian bookstore that hosts Bible studies)
- **Solution**: 
  - Allow **primary type** + **secondary category** from different type map (e.g., Type Church, Secondary Professional Services > Education)
  - Use **hashtags** for additional descriptors: `#ChristianSchool`, `#Bookstore`, `#Nonprofit`
  - Future: allow multiple types with primary/secondary type selector (up to 2, like denominations)

### Online-Only Entities
- **Churches**: Online church, no physical address — toggle On hides location, preview shows "Online-only • Serves nationwide", search shows in nationwide filter
- **Events**: Virtual conference — toggle On should show "Virtual link" field (website) and hide venue address, but keep City optional for timezone
- **Businesses**: Nationwide service (e.g., Christian counseling via Zoom) — toggle On hides address, but allow City as HQ optional (not required)
- **Implementation**: Completion logic for contact section returns true when online-only checked, regardless of city/region

### Type Change After Category Selected
- **Problem**: User selects Business > Bakeries, then changes type to Church — category now invalid
- **Solution**: On type change, check if current category slug exists in new filtered list. If not, clear hidden inputs, hide chips, show warning toast: "Category cleared — Bakeries doesn't apply to Churches. Please select a new category." Keep previous selection in memory for undo (optional)

### Migration of Existing Listings
- **Problem**: Existing DB has listings with mismatched type/category (e.g., Church + Restaurant) from old system
- **Solution**: Create mapping table for migration:
  - If type Church and category in business industries, map to Public Services > Religious (or flag for review)
  - Provide admin tool to bulk re-categorize
  - Keep `customCategory` as fallback
  - Do NOT auto-delete — flag as `needs_review` for owner to update

### Admin Taxonomy Management
- **Scalability**: Hardcoded `TYPE_CATEGORY_MAP` in frontend is not scalable. Need admin UI (`/admin/taxonomy`) to manage allowed industries per type without code deploy
- **Proposal**: Add DB tables `listing_type_categories` (type_slug, industry_slug, category_slug, is_allowed) and API to fetch filtered categories
- **For now**: Keep map in code, but structure it to be easily moved to DB later

### Search & Browse
- **Browse**: `/search?ltype=church` should show only church-relevant category filters, not all 40 industries
- **SEO**: Category pages like `/browse/food-drink/bakeries-desserts` should only show Business listings, not Churches — need to filter by type in queries
- **Sitemap**: Generate type-aware sitemap entries

### Validation & Accessibility
- **Validation**: Primary category required for Publish, but optional for Draft — already implemented. Add type-specific required fields later (e.g., Event requires date)
- **Accessibility**: When dropdown options change dynamically, announce to screen readers via `aria-live="polite"` region: "Categories updated — 8 options for Churches"
- **Keyboard**: Native `<select>` is keyboard accessible (already). Ensure toggle is keyboard accessible (Space/Enter) and has visible focus ring `peer-focus:ring-2`

### Future Enhancements
- **Event-specific fields**: When Type=Event, show Date, End Date, Frequency, Venue Name, Ticket Link
- **School-specific**: Show Enrollment, Grades, Accreditation
- **Church-specific**: Show Service Times, Service Style, Average Attendance
- **Business-specific**: Show Hours, Price Range, Licensed (if requiresLicense)
- **Progressive profiling**: Only show relevant fields per type to reduce form length

### Data Model Considerations
- Current `listings` table has `type_slug`, `industry_slug`, `category_slug` — sufficient for new IA, no schema change needed
- Add `is_online_only` boolean already exists
- Consider adding `type_specific_data` JSONB for future per-type attributes (service times, event dates, etc.) to keep schema flexible

---

## Summary Recommendation

**Implement Option A: Type-Driven Conditional Categories**

1. Rename "Listing Type" → "What best describes you?" with clearer card descriptions
2. Make Type selection filter Primary Category dropdown to only relevant industries/categories
3. Keep standard dropdown for Primary Category (already done per latest prompt), with validation message
4. Keep Online-only toggle with On/Off and dynamic hide of location fields (already done)
5. Restore original palette (already done — brass #8f7028, parchment #faf8f3)
6. Add inline help and warning when type changes invalidates category
7. Future: Move mapping to DB + admin UI for scalability

This fixes the mismatch at the source, reduces cognitive load from 40+ to 5-12 relevant options, improves data quality, and keeps the system intuitive and scalable.

---

## 6. Implementation Status (2026-09-25)

### What was built

**File: `src/pages/add-listing.astro`**

- **Frontmatter constants**:
  ```ts
  TYPE_CATEGORY_MAP = {
    business: ['food-drink','health-medical','home-services','professional-services','shopping','arts-entertainment','travel-lodging','other-industries'],
    church: ['public-services'],
    ministry: ['public-services'],
    nonprofit: ['public-services','other-industries'],
    school: ['professional-services'],
    event: ['arts-entertainment','travel-lodging','other-industries'],
    other: all industries
  }
  TYPE_CATEGORY_FILTER = {
    church: { 'public-services': ['religious','community'] },
    ministry: { 'public-services': ['religious','community'] },
    nonprofit: { 'public-services': ['community','government'] },
    school: { 'professional-services': ['education'] },
    event: { 'arts-entertainment': ['events-venues','outdoor-activities','sports-recreation','museums-galleries','nightlife'], 'travel-lodging': ['tours-attractions'] }
  }
  ```

- **Label rename**: "Listing type *" → "What best describes you? *" with helper "Select the type that best fits — this filters categories to only relevant options."

- **Category section**:
  - Primary `<select>` now `disabled` until type selected, placeholder "Select a type first" → "Select a category" after type
  - Helper `#category-filter-help` dynamic per type (e.g., "Showing faith-based categories for Churches")
  - Status `#category-filter-status` aria-live shows count "8 categories available for this type"
  - Warning `#category-type-warning` (amber) when type change invalidates existing category
  - `rebuildCategorySelectForType(typeSlug)` clears and rebuilds optgroups/options from `industries` filtered by map + filter, updates `filteredFlatCategories` for secondary search, handles invalidation, updates preview/completion

- **Secondary category**: searchable input now uses `filteredFlatCategories` (type-filtered) instead of full list, and is cleared if invalid after type change

- **define:vars** now passes `industries`, `typeCategoryMap`, `typeCategoryFilter` to client script

**E2E updates**:

- `e2e-listing-creation.mjs` (103/103 PASS): checks disabled state, placeholder, help text, type-driven filtering (business vs church optgroup counts), invalidation warning, then proceeds with business flow
- `e2e-multidenom-category.mjs` (75/75 PASS): selects business type first before category, checks filtered counts

**Build**: `npm run build` PASS (Astro 7.3.3)

**Workspace size**: 3.1M after cleanup (node_modules, data/db, .astro, .node22, .cache removed) — well below 6MB limit, ready for copy-paste

### User flow after implementation

1. User lands on /add-listing → Category dropdown disabled, help says "Please select an organization type first"
2. User selects "Business" card → dropdown enables, shows 8 industries, ~60 options, help "Showing business categories", status "60 categories available"
3. User selects "Church" → dropdown rebuilds to 1 industry, ~5-8 options, help "Showing faith-based categories for Churches", status "5 categories available"
4. If user had Bakeries selected and switches to Church, warning appears, category cleared, hidden inputs cleared, chip hidden
5. Secondary category search only shows allowed categories for current type
6. Publish requires valid filtered category; draft allows empty

### Remaining future work (not required for this task)

- Move `TYPE_CATEGORY_MAP` to DB + admin UI `/admin/taxonomy`
- Add type-specific fields (Event dates, School grades, Church service times) via `type_specific_data` JSONB
- Browse/search filters type-aware (`/search?ltype=church` only shows church-relevant filters)
