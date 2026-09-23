/**
 * Sample listing dataset — used for local preview/demo when DATABASE_URL
 * is unset, and as seed content for production. Every record mirrors the
 * `listings` table shape so swapping to Postgres is seamless.
 *
 * Scope: five focus states / six metro areas (see data/locations.ts).
 * Quality rules: complete profiles only — contact info, hours, services,
 * service area, reviews, and verification dates. No placeholder text.
 */

export interface SampleReview {
  name: string;
  rating: number;
  title: string;
  body: string;
  daysAgo: number;
  verified: boolean;
  ownerResponse?: string;
}

export interface SamplePhoto {
  hue: number;
  caption: string;
}

export interface SampleListing {
  id: string;
  slug: string;
  name: string;
  typeSlug: string;
  tagline: string;
  description: string;
  city: string;
  region: string;
  postalCode?: string;
  country?: string;
  lat?: number;
  lng?: number;
  isOnlineOnly?: boolean;
  phone?: string;
  email?: string;
  website?: string;
  priceRange?: string;
  industries: string[];
  professions: string[];
  denominations: string[];
  hashtags: string[];
  services: string[];
  languages: string[];
  accessibility: string[];
  badges: string[];
  rating: number;
  reviewCount: number;
  recommendations: number;
  views: number;
  featured?: boolean;
  claimed?: boolean;
  verified?: boolean;
  /** How verification was performed — shown on the profile. */
  verificationMethod?: 'attestation + documents' | 'review-team check' | 'credential check with issuer' | 'church recommendation';
  /** Days since the most recent verification pass. */
  lastVerifiedDaysAgo?: number;
  updatedDaysAgo?: number;
  foundedYear?: number;
  serviceArea?: string;
  social?: { facebook?: string; instagram?: string; youtube?: string; x?: string; linkedin?: string };
  photos?: SamplePhoto[];
  hours?: Record<string, string>;
  statementOfFaith?: string;
  reviews?: SampleReview[];
  addedDaysAgo: number;
  openNow?: boolean;
  imageHue: number;
}

const r = (
  name: string, rating: number, title: string, body: string,
  daysAgo: number, verified = false, ownerResponse?: string,
): SampleReview => ({ name, rating, title, body, daysAgo, verified, ownerResponse });

const ph = (hue: number, caption: string): SamplePhoto => ({ hue, caption });

export const SAMPLE_LISTINGS: SampleListing[] = [

  // ============================== DALLAS, TX ==============================

  {
    id: 'l01', slug: 'grace-and-grain-bakery', name: 'Grace & Grain Bakery', typeSlug: 'business',
    tagline: 'Small-batch sourdough, wedding cakes & pastries — baked fresh at 4 a.m.',
    description: 'Family-owned bakery in East Dallas. Aaron and Julie Whitaker run the ovens themselves: custom celebration cakes, wedding tiers, artisan bread, and gluten-free pastries. They cater church events and VBS weeks, and donate day-old bread to local shelters every evening. Closed Sundays.',
    city: 'Dallas', region: 'TX', postalCode: '75214', lat: 32.802, lng: -96.745,
    phone: '(214) 555-0182', email: 'hello@graceandgrain.example.com', website: 'https://example.com/grace-grain', priceRange: '$$',
    industries: ['food-beverage'], professions: ['baker', 'caterer'], denominations: ['southern-baptist'],
    hashtags: ['Baptist', 'Bakery', 'ChristianOwned', 'FamilyOwned', 'Dallas', 'WeddingCakes'],
    services: ['Custom Cakes', 'Wedding Tiers', 'Sourdough & Bread', 'Pastries', 'Gluten-Free Baking', 'Event Catering'],
    languages: ['English', 'Spanish'], accessibility: ['Wheelchair Access', 'Street-level entry'],
    badges: ['claimed', 'christian_owned'], rating: 4.9, reviewCount: 212, recommendations: 480, views: 18400,
    featured: true, claimed: true, verified: true, verificationMethod: 'attestation + documents', lastVerifiedDaysAgo: 12, updatedDaysAgo: 6,
    foundedYear: 2016, serviceArea: 'Dallas County and nearby suburbs; delivery within 25 miles',
    social: { facebook: 'graceandgrain', instagram: 'graceandgrainbakery' },
    photos: [ph(36, 'Storefront on Garland Rd'), ph(20, 'Wedding cake in progress'), ph(50, 'Saturday morning counter')],
    hours: { Mon: '7a–6p', Tue: '7a–6p', Wed: '7a–6p', Thu: '7a–6p', Fri: '7a–7p', Sat: '8a–4p', Sun: 'Closed' },
    statementOfFaith: 'We believe every loaf is a gift. Our family belongs to a local Baptist congregation; we close Sundays to worship and rest.',
    reviews: [
      r('Sarah M.', 5, 'Our wedding cake was perfect', 'Three tiers, exact colors, delivered on time to the venue. They even boxed slices for our grandparents.', 18, true, 'Thank you, Sarah! It was an honor to bake for y\u2019all.'),
      r('James T.', 5, 'Best sourdough in Dallas', 'The Friday loaves sell out by noon for a reason. Staff remembers my name and my order.', 34, true),
      r('Ruth K.', 4, 'Wonderful — but busy', 'Very busy (for good reason!). Order ahead online. Kind staff and fair prices.', 61),
    ],
    addedDaysAgo: 400, openNow: true, imageHue: 36,
  },

  {
    id: 'l02', slug: 'new-life-fellowship-dallas', name: 'New Life Fellowship', typeSlug: 'church',
    tagline: 'A multi-generational Baptist church in the heart of Dallas.',
    description: 'Sunday worship at 9:00 and 11:00 AM with full kids ministry, youth group, Spanish-language Bible study, and a weekly food pantry serving 300+ families. Wheelchair-accessible campus with sensory-friendly seating and ASL interpretation at the 11 AM service.',
    city: 'Dallas', region: 'TX', postalCode: '75206', lat: 32.799, lng: -96.77,
    phone: '(214) 555-0140', email: 'office@newlifedallas.example.com', website: 'https://example.com/newlife',
    industries: ['religious-organizations'], professions: ['pastor'], denominations: ['southern-baptist'],
    hashtags: ['Baptist', 'Church', 'Dallas', 'YouthMinistry', 'WheelchairAccess', 'BibleStudy', 'FoodDrive'],
    services: ['Sunday Worship', 'Kids Ministry', 'Youth Group', 'Food Pantry', 'Bible Study', 'ASL Interpretation'],
    languages: ['English', 'Spanish'], accessibility: ['Wheelchair Access', 'ASL Interpretation', 'Sensory-friendly seating'],
    badges: ['claimed', 'church'], rating: 4.8, reviewCount: 340, recommendations: 920, views: 32100,
    featured: true, claimed: true, verified: true, verificationMethod: 'review-team check', lastVerifiedDaysAgo: 21, updatedDaysAgo: 8,
    foundedYear: 1958, serviceArea: 'East Dallas and Lakewood',
    social: { facebook: 'newlifedallas', youtube: 'newlifedallas' },
    photos: [ph(160, 'Sunday worship'), ph(150, 'Food pantry Saturday'), ph(170, 'Kids wing')],
    hours: { Sun: '9a & 11a worship', Wed: '6:30p midweek', 'Mon–Tue': 'Office 9a–4p' } as unknown as Record<string, string>,
    statementOfFaith: 'We affirm the Baptist Faith & Message (2000): one God in three Persons, salvation by grace through faith, believer\u2019s baptism, and the authority of Scripture.',
    reviews: [
      r('Denise O.', 5, 'Like family', 'We visited once and were adopted. Small groups are where this church really shines.', 12, true),
      r('Victor H.', 5, 'Care for the city', 'The pantry served my family during a hard season. Dignity and kindness every week.', 47, true, 'Victor, thank you. The pantry runs on volunteers who love this neighborhood.'),
    ],
    addedDaysAgo: 500, openNow: false, imageHue: 160,
  },

  {
    id: 'l03', slug: 'mercy-well-counseling', name: 'Mercy Well Christian Counseling', typeSlug: 'counselor',
    tagline: 'Licensed, faith-integrated counseling for individuals, couples & teens.',
    description: 'Dr. Hannah Reyes, LPC-S, leads a team of six licensed counselors offering Christ-centered care: marriage intensives, trauma-informed therapy, addiction recovery, and pastoral counseling. In-person in North Dallas and secure telehealth across Texas. Spanish-speaking counselors available.',
    city: 'Dallas', region: 'TX', postalCode: '75230', lat: 32.86, lng: -96.77,
    phone: '(214) 555-0117', email: 'care@mercywell.example.com', website: 'https://example.com/mercywell', priceRange: '$$$',
    industries: ['healthcare-wellness'], professions: ['christian-counselor'], denominations: ['non-denominational'],
    hashtags: ['Counselor', 'ChristianOwned', 'Licensed', 'SpanishSpeaking', 'Dallas', 'OnlineServices'],
    services: ['Marriage Counseling', 'Teen Counseling', 'Trauma Recovery', 'Addiction Counseling', 'Pastoral Counseling', 'Telehealth'],
    languages: ['English', 'Spanish'], accessibility: ['Wheelchair Access', 'Telehealth', 'Evening appointments'],
    badges: ['claimed', 'christian_owned', 'professional_credential'], rating: 5.0, reviewCount: 187, recommendations: 610, views: 22800,
    featured: true, claimed: true, verified: true, verificationMethod: 'credential check with issuer', lastVerifiedDaysAgo: 9, updatedDaysAgo: 9,
    foundedYear: 2013, serviceArea: 'North Dallas in person; telehealth statewide in Texas',
    social: { instagram: 'mercywellcounseling', linkedin: 'mercy-well-counseling' },
    photos: [ph(200, 'Quiet waiting room'), ph(190, 'Counseling offices'), ph(210, 'Team of six counselors')],
    hours: { Mon: '8a–7p', Tue: '8a–7p', Wed: '8a–7p', Thu: '8a–7p', Fri: '8a–5p', Sat: 'By appointment', Sun: 'Closed' },
    statementOfFaith: 'We hold Scripture as our counseling authority and integrate evidence-based care with prayer, always honoring each client\u2019s conscience and tradition.',
    reviews: [
      r('Anonymous', 5, 'Saved our marriage', 'The intensive weekend was hard work and worth every hour. Dr. Reyes is direct, kind, and never rushed us.', 9, true),
      r('Cynthia P.', 5, 'Teen counselor who listens', 'Our son opened up in ways he never did before. Evening appointments made scheduling possible.', 26, true),
    ],
    addedDaysAgo: 300, openNow: true, imageHue: 200,
  },

  {
    id: 'l04', slug: 'cornerstone-plumbing', name: 'Cornerstone Plumbing Co.', typeSlug: 'contractor',
    tagline: 'Licensed plumbers serving Dallas homes, churches & businesses.',
    description: 'Master-licensed plumbers handling repairs, water heaters, repipes, and remodel rough-ins. Flat-rate pricing quoted before work starts, background-checked technicians, and financing if you need it. Church facility maintenance plans include priority response — they answer on Saturdays.',
    city: 'Dallas', region: 'TX', postalCode: '75207', lat: 32.78, lng: -96.81,
    phone: '(214) 555-0166', email: 'dispatch@cornerstoneplumbing.example.com', website: 'https://example.com/cornerstone', priceRange: '$$',
    industries: ['construction-skilled-trades'], professions: ['plumber'], denominations: ['non-denominational'],
    hashtags: ['Plumber', 'ChristianOwned', 'Licensed', 'FinancingAvailable', 'Dallas'],
    services: ['Leak Repairs', 'Water Heaters', 'Whole-home Repipes', 'Remodel Rough-ins', 'Church Maintenance Plans'],
    languages: ['English', 'Spanish'], accessibility: [],
    badges: ['claimed', 'christian_owned', 'professional_credential'], rating: 4.7, reviewCount: 158, recommendations: 402, views: 15300,
    claimed: true, verified: true, verificationMethod: 'credential check with issuer', lastVerifiedDaysAgo: 17, updatedDaysAgo: 17,
    foundedYear: 2009, serviceArea: 'Dallas County + 25-mile radius',
    social: { facebook: 'cornerstoneplumbingdfw' },
    photos: [ph(210, 'Service vans'), ph(220, 'Repipe in progress'), ph(200, 'Team huddle at 7:30a')],
    hours: { Mon: '7a–7p', Tue: '7a–7p', Wed: '7a–7p', Thu: '7a–7p', Fri: '7a–7p', Sat: '8a–2p', Sun: 'Closed' },
    reviews: [
      r('Rachel T.', 5, 'Saturday save', 'Water heater died Friday night. They answered the phone Saturday morning and had hot water back by 2 PM. Flat price, no surprises.', 15, true, 'Rachel — glad we could help. Enjoy the hot showers!'),
      r('Pastor Dale W.', 5, 'Our church\u2019s plumber for years', 'Maintenance plan is worth it. Priority response when the fellowship hall flooded — they were there in 90 minutes.', 38, true),
      r('Miguel S.', 4, 'Solid work', 'Repipe took a day longer than quoted (old house, of course), but they discounted the extra day. Fair people.', 72),
    ],
    addedDaysAgo: 260, openNow: true, imageHue: 210,
  },

  {
    id: 'l19', slug: 'anvil-light-electric', name: 'Anvil & Light Electric', typeSlug: 'contractor',
    tagline: 'Residential electrician — panels, EV chargers & lighting done right.',
    description: 'Father-and-son electrical crew serving East Dallas. Panel upgrades, EV charger installation, recessed lighting, and whole-home surge protection. Permit pulled on every job, and they text you a photo report when work is complete.',
    city: 'Dallas', region: 'TX', postalCode: '75218', lat: 32.809, lng: -96.709,
    phone: '(214) 555-0173', email: 'hello@anvillight.example.com', website: 'https://example.com/anvillight', priceRange: '$$',
    industries: ['construction-skilled-trades', 'home-services'], professions: ['residential-electrician'], denominations: ['united-methodist'],
    hashtags: ['Electrician', 'Licensed', 'Dallas', 'ChristianOwned', 'FamilyOwned'],
    services: ['Panel Upgrades', 'EV Chargers', 'Recessed Lighting', 'Surge Protection', 'Ceiling Fans'],
    languages: ['English'], accessibility: [],
    badges: ['claimed', 'christian_owned', 'professional_credential'], rating: 4.8, reviewCount: 96, recommendations: 230, views: 8700,
    claimed: true, verified: false, verificationMethod: 'credential check with issuer', lastVerifiedDaysAgo: 31, updatedDaysAgo: 24,
    foundedYear: 2011, serviceArea: 'East Dallas, Lakewood, Casa Linda',
    social: { facebook: 'anvillightelectric' },
    photos: [ph(45, 'Panel upgrade'), ph(35, 'EV charger install')],
    hours: { Mon: '8a–6p', Tue: '8a–6p', Wed: '8a–6p', Thu: '8a–6p', Fri: '8a–5p', Sat: '9a–1p', Sun: 'Closed' },
    reviews: [
      r('Tom & Becky L.', 5, 'Texts with photos!', 'They sent photo updates while we were at work. Charged exactly the quote. EV charger works great.', 22, true),
      r('Gwen A.', 5, 'Honest assessment', 'Told me my panel did NOT need replacing when another company said it did. Earned a customer for life.', 55, true),
    ],
    addedDaysAgo: 95, openNow: true, imageHue: 45,
  },

  {
    id: 'l20', slug: 'redeemer-coffee-house', name: 'Redeemer Coffee House', typeSlug: 'business',
    tagline: 'Neighborhood espresso bar with a pay-it-forward board.',
    description: 'Third-wave coffee near White Rock Lake: single-origin espresso, pour-overs, and fresh kolaches from a Texas bakery. The pay-it-forward board funds drinks for teachers, nurses, and anyone having a day. Study-friendly with fast Wi-Fi until 6.',
    city: 'Dallas', region: 'TX', postalCode: '75218', lat: 32.815, lng: -96.723,
    phone: '(214) 555-0109', email: 'howdy@redeemercoffee.example.com', website: 'https://example.com/redeemercoffee', priceRange: '$',
    industries: ['food-beverage'], professions: ['coffee-shop'], denominations: ['non-denominational'],
    hashtags: ['Coffee', 'Dallas', 'ChristianOwned', 'StudySpot'],
    services: ['Espresso & Pour-overs', 'Fresh Kolaches', 'Pay-it-forward Board', 'Study Space', 'Catering Trays'],
    languages: ['English', 'Spanish'], accessibility: ['Wheelchair Access'],
    badges: ['claimed', 'christian_owned'], rating: 4.7, reviewCount: 143, recommendations: 310, views: 11200,
    claimed: true, verified: false, verificationMethod: 'attestation + documents', lastVerifiedDaysAgo: 27, updatedDaysAgo: 14,
    foundedYear: 2019, serviceArea: 'East Dallas',
    social: { instagram: 'redeemercoffeehouse' },
    photos: [ph(25, 'Espresso bar'), ph(15, 'Pay-it-forward board'), ph(35, 'Latte art')],
    hours: { Mon: '6a–6p', Tue: '6a–6p', Wed: '6a–6p', Thu: '6a–6p', Fri: '6a–8p', Sat: '7a–8p', Sun: '8a–2p' },
    reviews: [
      r('Jenny F.', 5, 'My morning stop', 'Kind baristas, serious coffee, and the kolaches disappear fast. The forward board makes me smile every time.', 11, true),
      r('Andre B.', 4, 'Great study spot', 'Wi-Fi is quick and they do not rush you. Weekends get loud by 10.', 44),
    ],
    addedDaysAgo: 180, openNow: true, imageHue: 25,
  },

  {
    id: 'l21', slug: 'beacon-cpa-dallas', name: 'Beacon Accounting & Tax', typeSlug: 'professional',
    tagline: 'CPA firm for small businesses, pastors & nonprofits.',
    description: 'Elizabeth Osei, CPA, leads a four-person firm specializing in small-business taxes, clergy housing allowances, and nonprofit filings (990s). Fixed monthly pricing published on the website. Free 30-minute consult for new clients and ministry leaders.',
    city: 'Dallas', region: 'TX', postalCode: '75231', lat: 32.885, lng: -96.755,
    phone: '(214) 555-0128', email: 'elizabeth@beaconcpa.example.com', website: 'https://example.com/beaconcpa', priceRange: '$$',
    industries: ['accounting-tax'], professions: ['cpa'], denominations: ['non-denominational'],
    hashtags: ['Accountant', 'CPA', 'Licensed', 'Dallas', 'Nonprofit', 'ChristianOwned'],
    services: ['Small-business Tax', 'Nonprofit 990s', 'Clergy Tax', 'Bookkeeping', 'Payroll'],
    languages: ['English'], accessibility: ['Telehealth', 'Wheelchair Access'],
    badges: ['claimed', 'christian_owned', 'professional_credential'], rating: 4.9, reviewCount: 104, recommendations: 280, views: 9600,
    claimed: true, verified: true, verificationMethod: 'credential check with issuer', lastVerifiedDaysAgo: 19, updatedDaysAgo: 19,
    foundedYear: 2014, serviceArea: 'Dallas–Fort Worth; remote clients statewide',
    social: { linkedin: 'beacon-accounting-tax' },
    photos: [ph(190, 'The Beacon team'), ph(180, 'Consult room')],
    hours: { Mon: '9a–5p', Tue: '9a–5p', Wed: '9a–5p', Thu: '9a–6p', Fri: '9a–3p', Sat: 'By appointment', Sun: 'Closed' },
    reviews: [
      r('Pastor Jim R.', 5, 'Finally, clarity', 'Elizabeth explained our housing allowance in plain English and saved us real money. She trains our board treasurer every January.', 20, true, 'Pastor Jim, the yearly treasurer training is my favorite meeting. See you in January!'),
      r('Nadia C.', 5, 'Nonprofit 990s handled', 'Filed our first 990 without panic. Fixed fee, clear deadlines, no jargon.', 41, true),
    ],
    addedDaysAgo: 210, openNow: true, imageHue: 190,
  },

  {
    id: 'l22', slug: 'sentinel-pest-defense', name: 'Sentinel Pest Defense', typeSlug: 'business',
    tagline: 'Family-safe pest control with a 48-hour re-service promise.',
    description: 'Locally owned pest control for homes, restaurants, and churches. Integrated pest management first — targeted treatments, not blanket spraying. Free re-service between quarterly visits if anything crawls back. Kid-and-pet-safe options explained up front.',
    city: 'Dallas', region: 'TX', postalCode: '75228', lat: 32.785, lng: -96.66,
    phone: '(214) 555-0154', email: 'service@sentinelpest.example.com', website: 'https://example.com/sentinelpest', priceRange: '$',
    industries: ['home-services'], professions: ['pest-control'], denominations: ['church-of-christ'],
    hashtags: ['PestControl', 'Dallas', 'ChristianOwned', 'FamilyOwned'],
    services: ['Quarterly Plans', 'Termite Inspections', 'Mosquito Service', 'Commercial Accounts', 'Re-service Guarantee'],
    languages: ['English', 'Spanish'], accessibility: [],
    badges: ['claimed', 'christian_owned'], rating: 4.6, reviewCount: 89, recommendations: 190, views: 6400,
    claimed: true, verified: true, verificationMethod: 'attestation + documents', lastVerifiedDaysAgo: 44, updatedDaysAgo: 30,
    foundedYear: 2017, serviceArea: 'Dallas County and eastern suburbs',
    social: { facebook: 'sentinelpestdfw' },
    photos: [ph(120, 'Technician at work'), ph(110, 'Before/after garage treatment')],
    hours: { Mon: '8a–6p', Tue: '8a–6p', Wed: '8a–6p', Thu: '8a–6p', Fri: '8a–6p', Sat: '9a–1p', Sun: 'Closed' },
    reviews: [
      r('Hank M.', 5, 'Fire ants gone', 'Two treatments and the yard is usable again. Tech explained everything and booted off his shoes before coming inside. Respectful crew.', 33, true),
      r('Lisa D.', 4, 'Good, slight schedule mix-up', 'They came a day late (called ahead), but the re-service promise is real — ants returned once and they came back free.', 58),
    ],
    addedDaysAgo: 320, openNow: true, imageHue: 120,
  },

  {
    id: 'l23', slug: 'true-north-remodels', name: 'True North Remodeling', typeSlug: 'contractor',
    tagline: 'Kitchens & baths, built on written change orders.',
    description: 'Design-build remodeler for kitchens, bathrooms, and additions. Every change goes through a written change order with pricing before work continues — no surprise invoices. Owner Rick Halvorsen is on site daily. 3-year workmanship warranty.',
    city: 'Dallas', region: 'TX', postalCode: '75243', lat: 32.915, lng: -96.72,
    phone: '(214) 555-0187', email: 'rick@truenorthremodel.example.com', website: 'https://example.com/truenorth', priceRange: '$$$',
    industries: ['construction-skilled-trades'], professions: ['general-contractor'], denominations: ['non-denominational'],
    hashtags: ['Contractor', 'Remodeling', 'Licensed', 'Dallas', 'ChristianOwned'],
    services: ['Kitchen Remodels', 'Bathroom Remodels', 'Room Additions', 'Design Services', 'Warranty Work'],
    languages: ['English'], accessibility: [],
    badges: ['claimed', 'christian_owned', 'professional_credential'], rating: 4.8, reviewCount: 77, recommendations: 210, views: 7900,
    claimed: true, verified: true, verificationMethod: 'credential check with issuer', lastVerifiedDaysAgo: 23, updatedDaysAgo: 23,
    foundedYear: 2012, serviceArea: 'Northeast Dallas and Richardson',
    social: { instagram: 'truenorthremodels', facebook: 'truenorthremodels' },
    photos: [ph(95, 'Kitchen remodel, week 4'), ph(105, 'Before & after bath'), ph(85, 'Owner on site')],
    hours: { Mon: '7a–5p', Tue: '7a–5p', Wed: '7a–5p', Thu: '7a–5p', Fri: '7a–4p', Sat: 'By appointment', Sun: 'Closed' },
    reviews: [
      r('Meredith K.', 5, 'The change-order thing is real', 'We added a window mid-project. Written price, signed, done in a day. No drama, no surprise invoice.', 16, true),
      r('Doug P.', 5, 'Clean job site, cleaner communication', 'Daily updates and a covered pathway so our dogs stayed safe. Kitchen finished two days early.', 52, true, 'Doug — thanks. The dogs were excellent supervisors.'),
    ],
    addedDaysAgo: 240, openNow: true, imageHue: 95,
  },

  {
    id: 'l24', slug: 'florist-and-vine-dallas', name: 'The Florist & the Vine', typeSlug: 'business',
    tagline: 'Wedding florals & Sunday-best arrangements since 1998.',
    description: 'Second-generation florist near the Arboretum. Wedding and event florals, weekly church altar arrangements, sympathy flowers handled with genuine care, and same-day delivery across Dallas. The cool room is open for walk-in consultations on Saturdays.',
    city: 'Dallas', region: 'TX', postalCode: '75238', lat: 32.877, lng: -96.737,
    phone: '(214) 555-0196', email: 'orders@floristandvine.example.com', website: 'https://example.com/floristvine', priceRange: '$$',
    industries: ['retail'], professions: ['florist'], denominations: ['roman-catholic'],
    hashtags: ['Florist', 'Weddings', 'Dallas', 'FamilyOwned', 'SympathyFlowers'],
    services: ['Wedding Florals', 'Altar Arrangements', 'Sympathy Flowers', 'Same-day Delivery', 'Event D\u00e9cor'],
    languages: ['English', 'Vietnamese'], accessibility: ['Wheelchair Access'],
    badges: ['claimed', 'christian_owned'], rating: 4.9, reviewCount: 118, recommendations: 260, views: 8800,
    claimed: true, verified: true, verificationMethod: 'attestation + documents', lastVerifiedDaysAgo: 36, updatedDaysAgo: 20,
    foundedYear: 1998, serviceArea: 'Dallas metro; same-day within 20 miles',
    social: { instagram: 'floristandvine' },
    photos: [ph(130, 'Spring wedding arch'), ph(120, 'Altar arrangements'), ph(140, 'Cool-room consultation')],
    hours: { Mon: '9a–5p', Tue: '9a–5p', Wed: '9a–5p', Thu: '9a–6p', Fri: '9a–6p', Sat: '9a–4p', Sun: 'Closed' },
    reviews: [
      r('Amanda R.', 5, 'Handled sympathy flowers beautifully', 'During the hardest week of our lives they were gentle, fast, and the arrangement was stunning.', 8, true),
      r('St. Philip\u2019s office', 5, 'Our altar partner for 15 years', 'Weekly arrangements arrive fresh and on time, every single week.', 90, true),
    ],
    addedDaysAgo: 340, openNow: true, imageHue: 130,
  },

  {
    id: 'l25', slug: 'grace-dental-studio', name: 'Grace Dental Studio', typeSlug: 'professional',
    tagline: 'Gentle family dentistry — no judgment, no upsell.',
    description: 'Dr. Priya Nair and team provide family dentistry with transparent pricing boards in every room and an honest "watch it" list instead of unnecessary treatment plans. Friday morning appointments for teachers and first responders with a discount. Sedation options for anxious patients.',
    city: 'Dallas', region: 'TX', postalCode: '75230', lat: 32.878, lng: -96.793,
    phone: '(214) 555-0135', email: 'smile@gracedental.example.com', website: 'https://example.com/gracedental', priceRange: '$$',
    industries: ['healthcare-wellness'], professions: ['dentist'], denominations: ['non-denominational'],
    hashtags: ['Dentist', 'Licensed', 'Dallas', 'FamilyOwned', 'AnxietyFriendly'],
    services: ['Cleanings & Exams', 'Fillings', 'Whitening', 'Sedation Dentistry', 'Kids Dentistry'],
    languages: ['English', 'Hindi'], accessibility: ['Wheelchair Access'],
    badges: ['claimed', 'christian_owned', 'professional_credential'], rating: 4.8, reviewCount: 167, recommendations: 350, views: 12100,
    claimed: true, verified: true, verificationMethod: 'credential check with issuer', lastVerifiedDaysAgo: 15, updatedDaysAgo: 15,
    foundedYear: 2015, serviceArea: 'North Dallas',
    social: { instagram: 'gracedentalstudio' },
    photos: [ph(300, 'Bright operatories'), ph(310, 'Kids corner')],
    hours: { Mon: '8a–5p', Tue: '8a–5p', Wed: '10a–6p', Thu: '8a–5p', Fri: '7a–1p', Sat: 'By appointment', Sun: 'Closed' },
    reviews: [
      r('Tasha W.', 5, 'First dentist I do not dread', 'They talked me through everything, showed me the screen, and never pushed extras. My kids like going. Miracles happen.', 13, true),
      r('Robert E.', 5, 'Anxiety-friendly is accurate', 'Sedation done carefully, explained twice, checked on the next day by phone.', 49, true),
    ],
    addedDaysAgo: 150, openNow: true, imageHue: 300,
  },

  // ============================ FORT WORTH, TX ============================

  {
    id: 'l09', slug: 'covenant-legal-group', name: 'Covenant Legal Group', typeSlug: 'professional',
    tagline: 'Estate planning, church law & business counsel with integrity.',
    description: 'Attorneys Sarah and David Okafor serve families, nonprofits, and churches from their Sundance Square office: wills and trusts, church bylaws and 501(c)(3) filings, employment matters, and mediation. Free 20-minute consultations for ministry leaders.',
    city: 'Fort Worth', region: 'TX', postalCode: '76102', lat: 32.753, lng: -97.331,
    phone: '(817) 555-0174', email: 'intake@covenantlegal.example.com', website: 'https://example.com/covenant', priceRange: '$$$',
    industries: ['legal-services'], professions: ['attorney', 'mediator'], denominations: ['non-denominational'],
    hashtags: ['Attorney', 'Licensed', 'FortWorth', 'ChristianOwned', 'EstatePlanning'],
    services: ['Wills & Trusts', 'Church Law & 501(c)(3)', 'Business Formation', 'Mediation', 'Employment Counsel'],
    languages: ['English', 'Yoruba'], accessibility: ['Wheelchair Access'],
    badges: ['claimed', 'christian_owned', 'professional_credential'], rating: 4.9, reviewCount: 88, recommendations: 260, views: 8900,
    claimed: true, verified: true, verificationMethod: 'credential check with issuer', lastVerifiedDaysAgo: 26, updatedDaysAgo: 18,
    foundedYear: 2010, serviceArea: 'Tarrant County and greater DFW',
    social: { linkedin: 'covenant-legal-group', facebook: 'covenantlegaltx' },
    photos: [ph(230, 'Sundance Square office'), ph(240, 'Conference room')],
    hours: { Mon: '9a–5p', Tue: '9a–5p', Wed: '9a–5p', Thu: '9a–6p', Fri: '9a–2p', Sat: 'By appointment', Sun: 'Closed' },
    reviews: [
      r('Gloria S.', 5, 'Our church bylaws, finally right', 'They rewrote our 40-year-old bylaws, filed our 501(c)(3) amendment, and trained our trustees. Worth every dollar.', 19, true),
      r('Kent M.', 5, 'Mediation with heart', 'Settled a business dispute without court. Firm but fair — exactly what both sides needed.', 63, true),
    ],
    addedDaysAgo: 150, openNow: true, imageHue: 230,
  },

  {
    id: 'l12', slug: 'loaves-fishes-catering', name: 'Loaves & Fishes Catering', typeSlug: 'business',
    tagline: 'Southern comfort catering for weddings & church homecomings.',
    description: 'From 20-person rehearsal dinners to 800-guest homecomings: scratch-made Southern favorites, professional servers, and day-of coordination. Tasting boxes ship across Texas. The Anderles quote every event personally — no menu pricing games.',
    city: 'Fort Worth', region: 'TX', postalCode: '76110', lat: 32.732, lng: -97.31,
    phone: '(817) 555-0108', email: 'cindy@loavesfishes.example.com', website: 'https://example.com/loavesfishes', priceRange: '$$',
    industries: ['food-beverage'], professions: ['caterer'], denominations: ['church-of-christ'],
    hashtags: ['Caterer', 'FortWorth', 'FamilyOwned', 'Weddings', 'ChurchEvents'],
    services: ['Wedding Catering', 'Church Events', 'Homecomings', 'Corporate Lunches', 'Tasting Boxes'],
    languages: ['English'], accessibility: [],
    badges: ['claimed', 'christian_owned'], rating: 4.6, reviewCount: 67, recommendations: 180, views: 7400,
    claimed: true, verified: false, verificationMethod: 'attestation + documents', lastVerifiedDaysAgo: 40, updatedDaysAgo: 27,
    foundedYear: 2006, serviceArea: 'DFW wide; tasting boxes statewide',
    social: { facebook: 'loavesfishescatering', instagram: 'loavesfishesftw' },
    photos: [ph(20, 'Homecoming spread'), ph(30, 'Wedding buffet'), ph(10, 'Tasting box')],
    hours: { Mon: '9a–5p', Tue: '9a–5p', Wed: '9a–5p', Thu: '9a–5p', Fri: '9a–5p', Sat: 'Events', Sun: 'Events' },
    reviews: [
      r('First Baptist Arlington events team', 5, '800 guests, zero stress', 'Homecoming lunch for our whole congregation. Hot food, kind servers, fair invoice.', 25, true),
      r('Jared & Kim', 4, 'Great food, book early', 'Chicken-fried steak bar was the hit of the reception. They book out months ahead for a reason.', 57),
    ],
    addedDaysAgo: 60, openNow: true, imageHue: 20,
  },

  {
    id: 'l26', slug: 'trinity-auto-works', name: 'Trinity Auto Works', typeSlug: 'business',
    tagline: 'Honest auto repair with photos of everything they find.',
    description: 'Independent shop near the Stockyards. Every estimate comes with photos of the worn parts, and they show you the old parts after the job. Free inspections for single moms and widows on the first Saturday of each month. Shuttle to downtown and the Zoo.',
    city: 'Fort Worth', region: 'TX', postalCode: '76116', lat: 32.748, lng: -97.372,
    phone: '(817) 555-0143', email: 'service@trinityautoworks.example.com', website: 'https://example.com/trinityauto', priceRange: '$$',
    industries: ['automotive'], professions: ['auto-mechanic'], denominations: ['non-denominational'],
    hashtags: ['AutoRepair', 'ChristianOwned', 'FortWorth', 'FinancingAvailable'],
    services: ['Diagnostics', 'Brakes', 'Transmission Service', 'Pre-purchase Inspections', 'Fleet Accounts'],
    languages: ['English', 'Spanish'], accessibility: ['Wheelchair Access', 'Shuttle service'],
    badges: ['claimed', 'christian_owned'], rating: 4.7, reviewCount: 198, recommendations: 430, views: 13600,
    claimed: true, verified: true, verificationMethod: 'attestation + documents', lastVerifiedDaysAgo: 22, updatedDaysAgo: 11,
    foundedYear: 2004, serviceArea: 'Fort Worth and west side; fleet accounts DFW-wide',
    social: { facebook: 'trinityautoworks' },
    photos: [ph(205, 'Four bays, honest work'), ph(195, 'Photo estimate example'), ph(215, 'Free inspection Saturday')],
    hours: { Mon: '7:30a–6p', Tue: '7:30a–6p', Wed: '7:30a–6p', Thu: '7:30a–6p', Fri: '7:30a–6p', Sat: '8a–2p', Sun: 'Closed' },
    reviews: [
      r('Dana W.', 5, 'They showed me the broken part', 'Photo estimate before I approved a dime. Total matched. This is how every shop should run.', 10, true),
      r('Marcus J.', 4, 'Busy shop', 'Book ahead — they are popular. Straight talk about what could wait until next visit instead of stacking repairs.', 39, true, 'Marcus, thanks for the patience. We will always tell you what can wait.'),
    ],
    addedDaysAgo: 130, openNow: true, imageHue: 195,
  },

  {
    id: 'l27', slug: 'river-oak-community-church', name: 'River Oak Community Church', typeSlug: 'church',
    tagline: 'Come as you are — casual service, serious Scripture.',
    description: 'Two Sunday services (9:00 and 10:45) with coffee, kids check-in, and a band that sounds like Fort Worth. Active recovery ministry (Celebrate Recovery), foster-family support, and trail-head meetups for men\u2019s and women\u2019s Bible studies along the Trinity.',
    city: 'Fort Worth', region: 'TX', postalCode: '76107', lat: 32.767, lng: -97.36,
    phone: '(817) 555-0161', email: 'hello@riveroakfw.example.com', website: 'https://example.com/riveroak',
    industries: ['religious-organizations'], professions: ['pastor'], denominations: ['non-denominational'],
    hashtags: ['Church', 'FortWorth', 'RecoveryMinistry', 'FosterCare', 'BibleStudy'],
    services: ['Sunday Worship', 'Celebrate Recovery', 'Foster Family Support', 'Bible Studies', 'Kids Check-in'],
    languages: ['English'], accessibility: ['Wheelchair Access', 'Sensory-friendly seating'],
    badges: ['claimed', 'church'], rating: 4.8, reviewCount: 152, recommendations: 380, views: 12800,
    claimed: true, verified: false, verificationMethod: 'review-team check', lastVerifiedDaysAgo: 33, updatedDaysAgo: 16,
    foundedYear: 1996, serviceArea: 'West Fort Worth',
    social: { instagram: 'riveroakfw', facebook: 'riveroakfw' },
    photos: [ph(150, 'Sunday gathering'), ph(160, 'Recovery ministry night')],
    hours: { Sun: '9a & 10:45a worship', Tue: '7p Celebrate Recovery', Fri: 'Office 9a–3p' } as unknown as Record<string, string>,
    reviews: [
      r('Cheryl B.', 5, 'Celebrate Recovery changed us', 'My husband and I found real accountability here. No pretense, lots of grace.', 21, true),
      r('Terrence G.', 5, 'Foster families are seen', 'They wrapped our family with meals and respite care when we got our first placement.', 45, true),
    ],
    addedDaysAgo: 200, openNow: false, imageHue: 150,
  },

  {
    id: 'l28', slug: 'anchor-roofing-fort-worth', name: 'Anchor Roofing & Exteriors', typeSlug: 'contractor',
    tagline: 'Storm-damage specialists who document everything.',
    description: 'Family roofing company handling hail and wind damage, full replacements, and insurance claims. Drone inspection with a written report in your inbox within 24 hours. They meet your adjuster on site — you never argue with the insurance company alone.',
    city: 'Fort Worth', region: 'TX', postalCode: '76116', lat: 32.739, lng: -97.404,
    phone: '(817) 555-0119', email: 'estimates@anchorroofingfw.example.com', website: 'https://example.com/anchorroofing', priceRange: '$$',
    industries: ['construction-skilled-trades', 'home-services'], professions: ['roofer'], denominations: ['assemblies-of-god'],
    hashtags: ['Roofer', 'Licensed', 'FortWorth', 'StormDamage', 'ChristianOwned'],
    services: ['Storm Inspections', 'Roof Replacement', 'Insurance Claims Help', 'Gutters', 'Siding Repair'],
    languages: ['English', 'Spanish'], accessibility: [],
    badges: ['claimed', 'christian_owned', 'professional_credential'], rating: 4.7, reviewCount: 112, recommendations: 270, views: 9400,
    claimed: true, verified: true, verificationMethod: 'credential check with issuer', lastVerifiedDaysAgo: 29, updatedDaysAgo: 29,
    foundedYear: 2009, serviceArea: 'Tarrant and Parker counties',
    social: { facebook: 'anchorroofingfw' },
    photos: [ph(15, 'Drone inspection'), ph(25, 'Replacement in progress')],
    hours: { Mon: '8a–6p', Tue: '8a–6p', Wed: '8a–6p', Thu: '8a–6p', Fri: '8a–6p', Sat: 'Storm season only', Sun: 'Closed' },
    reviews: [
      r('Paula H.', 5, 'Insurance handled for me', 'After the April hailstorm they met my adjuster, got the claim approved, and the crew finished in one day. Yard spotless after.', 14, true),
      r('Deacon Frank O.', 5, 'Our steeple thanks you', 'Re-roofed our sanctuary without a single leak since. They worked around Wednesday services.', 66, true),
    ],
    addedDaysAgo: 170, openNow: true, imageHue: 15,
  },

  // ============================== NASHVILLE, TN ==============================

  {
    id: 'l07', slug: 'psalm-23-media', name: 'Psalm 23 Media', typeSlug: 'business',
    tagline: 'Church media team for livestreams, sermon clips & podcasts.',
    description: 'Creative studio helping churches look excellent online: multi-camera livestreams, sermon repurposing into clips, worship lyric videos, and podcast launches. Monthly retainers sized for churches under 500. They train your volunteers, not just your equipment.',
    city: 'Nashville', region: 'TN', postalCode: '37203', lat: 36.15, lng: -86.78,
    phone: '(615) 555-0128', email: 'studio@psalm23media.example.com', website: 'https://example.com/psalm23', priceRange: '$$',
    industries: ['information-technology', 'arts-media-entertainment'], professions: ['media-producer', 'videographer'], denominations: ['assemblies-of-god'],
    hashtags: ['Pentecostal', 'Media', 'OnlineServices', 'Nashville', 'Livestream'],
    services: ['Livestream Production', 'Sermon Clips', 'Podcast Launch', 'Lyric Videos', 'Volunteer Training'],
    languages: ['English', 'Spanish'], accessibility: ['Captions on request'],
    badges: ['claimed', 'christian_owned'], rating: 4.8, reviewCount: 74, recommendations: 210, views: 9800,
    claimed: true, verified: false, verificationMethod: 'attestation + documents', lastVerifiedDaysAgo: 48, updatedDaysAgo: 31,
    foundedYear: 2018, serviceArea: 'Nashville metro; remote editing nationwide',
    social: { youtube: 'psalm23media', instagram: 'psalm23media' },
    photos: [ph(265, 'Livestream rig'), ph(255, 'Podcast room')],
    hours: { Mon: '9a–6p', Tue: '9a–6p', Wed: '9a–6p', Thu: '9a–6p', Fri: '9a–4p', Sat: 'Shoots', Sun: 'Livestreams' },
    reviews: [
      r('Cornerstone Assembly', 5, 'Our streams look network-quality', 'They built a volunteer pipeline so we are not dependent on them forever. Rare integrity in this space.', 17, true),
      r('Pastor Maya J.', 5, 'Podcast launched in 3 weeks', 'From zero to published with a real audience plan. Training our team was the best part.', 52, true),
    ],
    addedDaysAgo: 90, openNow: true, imageHue: 265,
  },

  {
    id: 'l10', slug: 'living-waters-worship', name: 'Living Waters Worship Collective', typeSlug: 'musician',
    tagline: 'Worship nights, conferences & Sunday guest leading.',
    description: 'A five-piece worship team from Nashville available for church services, youth camps, conferences, and worship nights. Original songs plus fresh hymn arrangements, full PA for outdoor events, and a heart for small churches that cannot afford a big production.',
    city: 'Nashville', region: 'TN', postalCode: '37211', lat: 36.12, lng: -86.77,
    phone: '(615) 555-0149', email: 'booking@livingwaters.example.com', website: 'https://example.com/livingwaters', priceRange: '$$',
    industries: ['arts-media-entertainment'], professions: ['worship-artist'], denominations: ['vineyard'],
    hashtags: ['WorshipLeader', 'Evangelical', 'Nashville', 'WorshipNight', 'Conference'],
    services: ['Sunday Guest Leading', 'Worship Nights', 'Conference Sets', 'Youth Camps', 'Original Music'],
    languages: ['English'], accessibility: [],
    badges: ['claimed'], rating: 4.7, reviewCount: 45, recommendations: 150, views: 6200,
    claimed: true, verified: false, updatedDaysAgo: 12,
    foundedYear: 2021, serviceArea: 'Tennessee and surrounding states',
    social: { instagram: 'livingwatersworship', youtube: 'livingwatersworship' },
    photos: [ph(180, 'Worship night'), ph(170, 'Outdoor event setup')],
    hours: { Mon: 'By appointment', Tue: 'By appointment', Wed: 'By appointment', Thu: 'By appointment', Fri: 'By appointment', Sat: 'Events', Sun: 'Guest leading' },
    reviews: [
      r('Grace Chapel Brentwood', 5, 'Humble and excellent', 'Led our Sunday service like they had been part of the church for years. Small-church friendly pricing.', 29, true),
      r('Youth pastor Nick S.', 4, 'Camp highlight', 'Our students connected with the team all week. Bring earplugs for the front row.', 74),
    ],
    addedDaysAgo: 40, openNow: true, imageHue: 180,
  },

  {
    id: 'l29', slug: 'gracepoint-nashville', name: 'GracePoint Church', typeSlug: 'church',
    tagline: 'A young, diverse church plant in South Nashville.',
    description: 'Planted in 2021, GracePoint gathers Sundays at 10 AM in a renovated warehouse with kids ministry, a growing Spanish-speaking congregation, and a Wednesday night meal for international students at Vanderbilt. Come early — the coffee line is real.',
    city: 'Nashville', region: 'TN', postalCode: '37211', lat: 36.101, lng: -86.761,
    phone: '(615) 555-0176', email: 'hello@gracepointnash.example.com', website: 'https://example.com/gracepointnash',
    industries: ['religious-organizations'], professions: ['pastor'], denominations: ['non-denominational'],
    hashtags: ['Church', 'Nashville', 'ChurchPlant', 'SpanishSpeaking', 'Students'],
    services: ['Sunday Worship', 'Kids Ministry', 'Spanish Congregation', 'Student Dinners', 'Small Groups'],
    languages: ['English', 'Spanish'], accessibility: ['Wheelchair Access'],
    badges: ['claimed', 'church'], rating: 4.9, reviewCount: 96, recommendations: 240, views: 10200,
    claimed: true, verified: true, verificationMethod: 'review-team check', lastVerifiedDaysAgo: 18, updatedDaysAgo: 10,
    foundedYear: 2021, serviceArea: 'South Nashville',
    social: { instagram: 'gracepointnash' },
    photos: [ph(165, 'Sunday at the warehouse'), ph(155, 'Student dinner Wednesday')],
    hours: { Sun: '10a worship', Wed: '6:30p student dinner' } as unknown as Record<string, string>,
    statementOfFaith: 'Evangelical and creedal: we confess the Apostles\u2019 and Nicene Creeds and preach through books of the Bible.',
    reviews: [
      r('Andre C.', 5, 'Found our church home', 'Diversity is not a slogan here — our small group is five nations around one table.', 15, true),
      r('Lauren P.', 5, 'Welcomed on day one', 'Greeted by name the first Sunday. Kids ministry is small but mighty.', 38, true),
    ],
    addedDaysAgo: 120, openNow: false, imageHue: 165,
  },

  {
    id: 'l30', slug: 'cedar-ledger-bookkeeping', name: 'Cedar Ledger Bookkeeping', typeSlug: 'professional',
    tagline: 'Monthly bookkeeping with published starting rates.',
    description: 'Clean monthly books for small businesses, contractors, and churches. Starting rates published on the website ($250/mo for most small businesses), QuickBooks cleanup projects, and month-end reports a human actually explains. Owned by a certified bookkeeper and church treasurer.',
    city: 'Nashville', region: 'TN', postalCode: '37204', lat: 36.114, lng: -86.745,
    phone: '(615) 555-0132', email: 'hello@cedarledger.example.com', website: 'https://example.com/cedarledger', priceRange: '$',
    industries: ['accounting-tax'], professions: ['cpa'], denominations: ['united-methodist'],
    hashtags: ['Bookkeeping', 'Accounting', 'Nashville', 'ChristianOwned', 'TransparentPricing'],
    services: ['Monthly Bookkeeping', 'QuickBooks Cleanup', 'Payroll', 'Month-end Reports', 'Church Fund Accounting'],
    languages: ['English'], accessibility: ['Telehealth'],
    badges: ['claimed', 'christian_owned'], rating: 4.8, reviewCount: 58, recommendations: 140, views: 5300,
    claimed: true, verified: true, verificationMethod: 'attestation + documents', lastVerifiedDaysAgo: 37, updatedDaysAgo: 22,
    foundedYear: 2020, serviceArea: 'Nashville metro; remote clients in TN',
    social: { linkedin: 'cedar-ledger-bookkeeping' },
    photos: [ph(185, 'Organized desk, organized books'), ph(175, 'The Cedar Ledger workspace')],
    hours: { Mon: '9a–4p', Tue: '9a–4p', Wed: '9a–4p', Thu: '9a–4p', Fri: '9a–1p', Sat: 'Closed', Sun: 'Closed' },
    reviews: [
      r('Renovation contractor Mike D.', 5, 'My books are finally clean', 'Found $8k of uncategorized expenses in month one. Reports arrive on the 5th like clockwork.', 24, true),
      r('Fern C.', 4, 'Solid and affordable', 'Published rates mean no surprises. Waiting list in January — plan ahead.', 61),
    ],
    addedDaysAgo: 145, openNow: false, imageHue: 185,
  },

  {
    id: 'l31', slug: 'strong-tower-fitness', name: 'Strong Tower Fitness', typeSlug: 'business',
    tagline: 'Strength coaching for every body — seniors welcome.',
    description: 'Small-group and one-on-one strength coaching in a garage-gym setting without mirrors or intimidation. Specialties: 50+ strength, postpartum recovery, and teen athletes. Faith optional, encouragement standard — devotionals at 6 AM for those who want them.',
    city: 'Nashville', region: 'TN', postalCode: '37215', lat: 36.092, lng: -86.815,
    phone: '(615) 555-0188', email: 'coach@strongtowerfit.example.com', website: 'https://example.com/strongtower', priceRange: '$$',
    industries: ['fitness'], professions: ['personal-trainer'], denominations: ['non-denominational'],
    hashtags: ['Fitness', 'PersonalTrainer', 'Nashville', 'ChristianOwned', 'Seniors'],
    services: ['Small-group Strength', 'One-on-one Coaching', '50+ Strength', 'Postpartum Recovery', 'Teen Athletes'],
    languages: ['English'], accessibility: ['Ground-level entry'],
    badges: ['claimed', 'christian_owned'], rating: 4.9, reviewCount: 84, recommendations: 200, views: 7100,
    claimed: true, verified: true, verificationMethod: 'attestation + documents', lastVerifiedDaysAgo: 15, updatedDaysAgo: 26,
    foundedYear: 2019, serviceArea: 'South Nashville and Brentwood',
    social: { instagram: 'strongtowerfit' },
    photos: [ph(120, 'The 6 AM crew'), ph(130, 'Coaching session')],
    hours: { Mon: '5:30a–7p', Tue: '5:30a–7p', Wed: '5:30a–7p', Thu: '5:30a–7p', Fri: '5:30a–5p', Sat: '7a–11a', Sun: 'Closed' },
    reviews: [
      r('Grandma Pat, 71', 5, 'I deadlift now', 'At 71 I started from a chair. Coach meets you exactly where you are. My grandkids are impressed.', 7, true, 'Pat, you are the strongest person in the 6 AM crew. Do not tell the others.'),
      r('Will R.', 5, 'No mirrors, no judgment', 'Lost 30 pounds over a year. The encouragement is consistent and the programming is serious.', 43, true),
    ],
    addedDaysAgo: 22, openNow: true, imageHue: 120,
  },

  {
    id: 'l32', slug: 'holcomb-realty-group', name: 'Holcomb Realty Group', typeSlug: 'professional',
    tagline: 'East Nashville specialists — relocation & first-time buyers.',
    description: 'Sibling team (licensed Realtors) helping first-time buyers and families relocating for ministry across East Nashville and Madison. Honest pricing analysis, lender referrals without kickbacks, and evening showings for working families.',
    city: 'Nashville', region: 'TN', postalCode: '37206', lat: 36.178, lng: -86.737,
    phone: '(615) 555-0164', email: 'team@holcombrealty.example.com', website: 'https://example.com/holcombrealty', priceRange: '$$',
    industries: ['real-estate-property'], professions: ['realtor'], denominations: ['non-denominational'],
    hashtags: ['Realtor', 'Licensed', 'Nashville', 'FirstTimeBuyers', 'ChristianOwned'],
    services: ['Buyer Representation', 'First-time Buyer Programs', 'Relocation', 'Listing Services', 'Investment Property'],
    languages: ['English'], accessibility: ['Evening & weekend showings'],
    badges: ['claimed', 'christian_owned', 'professional_credential'], rating: 4.8, reviewCount: 73, recommendations: 180, views: 6900,
    claimed: true, verified: false, updatedDaysAgo: 35,
    foundedYear: 2016, serviceArea: 'East Nashville, Madison, Inglewood',
    social: { instagram: 'holcombrealty', facebook: 'holcombrealtygroup' },
    photos: [ph(30, 'Just listed in East Nashville'), ph(20, 'Key handoff day')],
    hours: { Mon: '9a–7p', Tue: '9a–7p', Wed: '9a–7p', Thu: '9a–7p', Fri: '9a–6p', Sat: '10a–4p', Sun: 'Afternoons' },
    reviews: [
      r('The Turnbulls', 5, 'Relocation champs', 'We bought from two states away. Video tours, honest advice on which street noises matter, and they negotiated $12k off asking.', 12, true),
      r('Pastoral family (moved for seminary)', 5, 'They get ministry moves', 'Understood our budget reality and found a house walking distance to our church plant.', 47, true),
    ],
    addedDaysAgo: 105, openNow: true, imageHue: 30,
  },

  {
    id: 'l33', slug: 'the-grooming-post', name: 'The Grooming Post', typeSlug: 'business',
    tagline: 'Classic barbershop — straight-razor shaves & honest talk.',
    description: 'Four-chair barbershop near 12South. Classic cuts, beard work, and straight-razor shaves with hot towels. Kids\u2019 first-haircut package includes a photo and a certificate. A barber quietly covers one senior-citizen cut every day from the community jar.',
    city: 'Nashville', region: 'TN', postalCode: '37204', lat: 36.121, lng: -86.796,
    phone: '(615) 555-0157', email: 'chairs@groomingpost.example.com', website: 'https://example.com/groomingpost', priceRange: '$',
    industries: ['beauty-personal-care'], professions: ['barber'], denominations: ['non-denominational'],
    hashtags: ['Barber', 'Nashville', 'ChristianOwned', 'KidsCuts', 'Community'],
    services: ['Classic Cuts', 'Straight-razor Shaves', 'Beard Work', 'Kids\u2019 First Haircut', 'Senior Discount Days'],
    languages: ['English'], accessibility: ['Wheelchair Access'],
    badges: ['claimed', 'christian_owned'], rating: 4.7, reviewCount: 209, recommendations: 390, views: 14300,
    claimed: true, verified: false, updatedDaysAgo: 19,
    foundedYear: 2015, serviceArea: '12South and surrounding neighborhoods',
    social: { instagram: 'groomingpostnash' },
    photos: [ph(260, 'The four chairs'), ph(270, 'First haircut certificate')],
    hours: { Tue: '9a–6p', Wed: '9a–6p', Thu: '9a–7p', Fri: '9a–6p', Sat: '8a–4p', Mon: 'Closed', Sun: 'Closed' },
    reviews: [
      r('DeShawn T.', 5, 'The only shop for my son', 'They take their time with his sensory needs. Patience you cannot train.', 9, true),
      r('Earl B., 82', 5, 'Forty years of cuts', 'Followed these barbers through three shops. The community jar thing? Class act.', 70, true),
    ],
    addedDaysAgo: 250, openNow: true, imageHue: 260,
  },

  {
    id: 'l34', slug: 'fretwork-music-lessons', name: 'Fretwork Music Lessons', typeSlug: 'business',
    tagline: 'Guitar, bass & ukulele lessons — patient teachers, real songs.',
    description: 'In-home and studio music lessons across South Nashville. Teachers who actually play out on weekends, lesson plans built around songs you love, and twice-yearly low-pressure recitals at a local coffee house. Loaner instruments for first-month students.',
    city: 'Nashville', region: 'TN', postalCode: '37211', lat: 36.098, lng: -86.792,
    phone: '(615) 555-0195', email: 'lessons@fretworkmusic.example.com', website: 'https://example.com/fretwork', priceRange: '$$',
    industries: ['music-education'], professions: ['music-teacher'], denominations: ['non-denominational'],
    hashtags: ['MusicLessons', 'Guitar', 'Nashville', 'Kids', 'Homeschool'],
    services: ['Guitar Lessons', 'Bass Lessons', 'Ukulele Lessons', 'Homeschool Music', 'Recitals'],
    languages: ['English'], accessibility: ['In-home lessons available'],
    badges: ['christian_owned'], rating: 4.9, reviewCount: 41, recommendations: 110, views: 3900,
    claimed: false, verified: false, updatedDaysAgo: 9,
    foundedYear: 2022, serviceArea: 'South Nashville, Brentwood, Franklin',
    social: { instagram: 'fretworkmusic' },
    photos: [ph(275, 'Studio lesson room'), ph(265, 'Coffee-house recital')],
    hours: { Mon: '3p–8p', Tue: '3p–8p', Wed: '3p–8p', Thu: '3p–8p', Fri: '3p–6p', Sat: '10a–2p', Sun: 'Closed' },
    reviews: [
      r('Homeschool mom of 3', 5, 'Recitals are magic', 'My shy daughter played in front of thirty people and beamed for a week. Teachers are gifted and gentle.', 6, true),
      r('Randy K.', 5, 'Learning at 54', 'Always wanted to play guitar. Six months in and I am playing worship songs with my church team.', 35, true),
    ],
    addedDaysAgo: 9, openNow: true, imageHue: 275,
  },

  // =============================== ATLANTA, GA ===============================

  {
    id: 'l05', slug: 'emmaus-photography', name: 'Emmaus Photography — Elena Marsh', typeSlug: 'professional',
    tagline: 'Wedding & portrait photographer for joyful, unhurried days.',
    description: 'Elena Marsh photographs weddings, baptisms, and family portraits across Metro Atlanta with a documentary, light-filled style. Packages include sneak-peek galleries in 48 hours and heirloom albums. Honored to serve every tradition\u2019s ceremonies — Orthodox liturgies to backyard vows.',
    city: 'Atlanta', region: 'GA', postalCode: '30308', lat: 33.749, lng: -84.388,
    phone: '(404) 555-0133', email: 'elena@emmausphoto.example.com', website: 'https://example.com/emmaus', priceRange: '$$$',
    industries: ['arts-media-entertainment'], professions: ['photographer'], denominations: ['non-denominational'],
    hashtags: ['Photographer', 'NonDenominational', 'Atlanta', 'Weddings', 'BaptismPhotos'],
    services: ['Weddings', 'Portraits', 'Baptism & Christening', 'Church Events', 'Heirloom Albums'],
    languages: ['English', 'Russian'], accessibility: [],
    badges: ['claimed', 'christian_owned'], rating: 4.9, reviewCount: 96, recommendations: 288, views: 11700,
    claimed: true, verified: true, verificationMethod: 'attestation + documents', lastVerifiedDaysAgo: 51, updatedDaysAgo: 26,
    foundedYear: 2015, serviceArea: 'Metro Atlanta; travel across the Southeast',
    social: { instagram: 'emmausphotoatl' },
    photos: [ph(300, 'Golden-hour wedding'), ph(290, 'Baptism at the font'), ph(310, 'Family session in Piedmont Park')],
    hours: { Mon: 'Editing', Tue: 'Editing', Wed: 'Sessions', Thu: 'Sessions', Fri: 'Sessions', Sat: 'Weddings', Sun: 'Rest' } as unknown as Record<string, string>,
    reviews: [
      r('The Okafors', 5, 'Sneak peeks in 48 hours, for real', 'We had photos for thank-you cards before the honeymoon ended. Elena moved through our liturgy like she had shot a hundred of them.', 11, true),
      r('Beth Ann W.', 5, 'Toddlers love her', 'Family session with a two-year-old and a newborn. Somehow everyone is smiling in the photos.', 36, true),
    ],
    addedDaysAgo: 120, openNow: true, imageHue: 300,
  },

  {
    id: 'l06', slug: 'st-brigid-catholic', name: 'St. Brigid Catholic Church', typeSlug: 'church',
    tagline: 'A welcoming Catholic parish with daily Mass & adoration.',
    description: 'Weekend Masses Saturday 5 PM, Sunday 8/10 AM, 12 PM, and 2 PM (Spanish). Daily Mass, confessions, RCIA, a vibrant young-adults ministry, and St. Vincent de Paul outreach. Fully accessible campus with a hearing-loop sanctuary.',
    city: 'Atlanta', region: 'GA', postalCode: '30305', lat: 33.82, lng: -84.38,
    phone: '(404) 555-0191', email: 'parish@stbrigidatl.example.com', website: 'https://example.com/stbrigid',
    industries: ['religious-organizations'], professions: ['pastor'], denominations: ['roman-catholic'],
    hashtags: ['Catholic', 'Church', 'Atlanta', 'SpanishSpeaking', 'WheelchairAccess', 'Volunteer'],
    services: ['Weekend & Daily Mass', 'Confession', 'RCIA', 'Adoration', 'Young Adults', 'Vincent de Paul Outreach'],
    languages: ['English', 'Spanish', 'Vietnamese'], accessibility: ['Wheelchair Access', 'Hearing loop'],
    badges: ['claimed', 'church'], rating: 4.9, reviewCount: 410, recommendations: 1100, views: 28900,
    featured: true, claimed: true, verified: true, verificationMethod: 'review-team check', lastVerifiedDaysAgo: 28, updatedDaysAgo: 13,
    foundedYear: 1962, serviceArea: 'North Atlanta (Buckhead)',
    social: { facebook: 'stbrigidatl', youtube: 'stbrigidatl' },
    photos: [ph(45, 'Sanctuary'), ph(35, 'Spanish Mass, 2 PM'), ph(55, 'Parish hall after Mass')],
    hours: { Sat: '5p Vigil', Sun: '8a, 10a, 12p, 2p (Espa\u00f1ol)', 'Mon–Fri': '12p Daily Mass' } as unknown as Record<string, string>,
    statementOfFaith: 'A parish of the Archdiocese of Atlanta, faithful to the Magisterium and the Catechism of the Catholic Church.',
    reviews: [
      r('Manuel & Rosa G.', 5, 'Our parish home', 'The 2 PM Spanish Mass feels like family, and the Vincent de Paul crew helped us through a hard winter.', 16, true),
      r('Katie L.', 5, 'RCIA changed my life', 'Came in curious, joined the Church at Easter. The team answered every question with patience.', 58, true),
    ],
    addedDaysAgo: 620, openNow: false, imageHue: 45,
  },

  {
    id: 'l08', slug: 'manna-food-ministry', name: 'Manna House Food Ministry', typeSlug: 'ministry',
    tagline: 'Feeding 1,200 families a month across Metro Atlanta.',
    description: 'Volunteer-powered food ministry distributing groceries, diapers, and hygiene kits every Saturday morning. Partners with 14 churches across denominations. Always welcoming new volunteers and food-drive hosts — no theology quiz at the door, just gloves and totes.',
    city: 'Atlanta', region: 'GA', postalCode: '30310', lat: 33.72, lng: -84.42,
    phone: '(404) 555-0155', email: 'serve@mannahouse.example.com', website: 'https://example.com/manna',
    industries: ['nonprofit-civic'], professions: ['volunteer-coordinator'], denominations: ['non-denominational', 'united-methodist'],
    hashtags: ['Ministry', 'Nonprofit', 'Atlanta', 'FoodDrive', 'Volunteer'],
    services: ['Food Distribution', 'Diaper Bank', 'Volunteer Opportunities', 'Food Drives', 'Church Partnerships'],
    languages: ['English', 'Spanish'], accessibility: ['Wheelchair Access'],
    badges: ['claimed', 'ministry'], rating: 5.0, reviewCount: 132, recommendations: 540, views: 14100,
    claimed: true, verified: true, verificationMethod: 'review-team check', lastVerifiedDaysAgo: 25, updatedDaysAgo: 25,
    foundedYear: 2009, serviceArea: 'Metro Atlanta',
    social: { instagram: 'mannahouseatl', facebook: 'mannahouseatl' },
    photos: [ph(120, 'Saturday distribution line'), ph(110, 'Volunteer packing crew'), ph(130, 'Diaper bank shelf')],
    hours: { Sat: '8–11:30a distribution', Wed: 'Warehouse crew 6–8p' } as unknown as Record<string, string>,
    reviews: [
      r('Volunteer coordinator, Redeemer Lutheran', 5, 'The best Saturday in Atlanta', 'Our youth group serves quarterly. Organized, joyful, and genuinely needed.', 13, true),
      r('Anonymous neighbor', 5, 'Dignity, not lines', 'They pray with you if you want and just love you if you do not. The diapers made the difference for us.', 31, true),
    ],
    addedDaysAgo: 200, openNow: false, imageHue: 120,
  },

  {
    id: 'l35', slug: 'peachtree-craftsmen', name: 'Peachtree Craftsmen', typeSlug: 'contractor',
    tagline: 'Craftsman-grade renovations with a written change-order process.',
    description: 'Full-service renovation firm: kitchens, baths, additions, and historic bungalow restorations across in-town Atlanta. Every project runs on a written change-order process, weekly photo updates, and a crew that lays floor protection like it is sacred ground. 5-year workmanship warranty.',
    city: 'Atlanta', region: 'GA', postalCode: '30324', lat: 33.79, lng: -84.366,
    phone: '(404) 555-0172', email: 'build@peachtreecraftsmen.example.com', website: 'https://example.com/peachtreecraftsmen', priceRange: '$$$',
    industries: ['construction-skilled-trades'], professions: ['general-contractor'], denominations: ['non-denominational'],
    hashtags: ['Contractor', 'Licensed', 'Atlanta', 'Remodeling', 'HistoricHomes'],
    services: ['Kitchen Renovations', 'Historic Restorations', 'Additions', 'Bath Renovations', 'Design-build'],
    languages: ['English'], accessibility: [],
    badges: ['claimed', 'christian_owned', 'professional_credential'], rating: 4.8, reviewCount: 84, recommendations: 240, views: 8600,
    claimed: true, verified: true, verificationMethod: 'credential check with issuer', lastVerifiedDaysAgo: 20, updatedDaysAgo: 20,
    foundedYear: 2011, serviceArea: 'In-town Atlanta: Buckhead to East Atlanta Village',
    social: { instagram: 'peachtreecraftsmen' },
    photos: [ph(95, 'Bungalow restoration'), ph(105, 'Craftsman kitchen'), ph(85, 'Floor protection, always')],
    hours: { Mon: '7:30a–5p', Tue: '7:30a–5p', Wed: '7:30a–5p', Thu: '7:30a–5p', Fri: '7:30a–4p', Sat: 'By appointment', Sun: 'Closed' },
    reviews: [
      r('Marcus D.', 5, 'The welcome packet won me over', 'Change-order template in writing before we signed. Renovation without anxiety. Finished on schedule.', 12, true),
      r('Virginia H.', 5, 'Historic home, gentle hands', 'Restored our 1923 bungalow trim instead of replacing it. Craftsmen is the right name.', 55, true),
    ],
    addedDaysAgo: 185, openNow: true, imageHue: 95,
  },

  {
    id: 'l36', slug: 'selah-weddings-events', name: 'Selah Weddings & Events', typeSlug: 'professional',
    tagline: 'Wedding & church-event planning with grace under pressure.',
    description: 'Full-service planning for weddings, vow renewals, and church conferences across Georgia. Two planners on every event, vendor lists built on firms that actually show up, and a rain-plan for everything outdoor. Day-of coordination starts at $1,200 — published on the site.',
    city: 'Atlanta', region: 'GA', postalCode: '30308', lat: 33.768, lng: -84.372,
    phone: '(404) 555-0121', email: 'hello@selahplans.example.com', website: 'https://example.com/selahplans', priceRange: '$$$',
    industries: ['professional-business-services'], professions: ['event-planner'], denominations: ['non-denominational'],
    hashtags: ['EventPlanner', 'Weddings', 'Atlanta', 'ChurchEvents', 'ChristianOwned'],
    services: ['Full-service Wedding Planning', 'Day-of Coordination', 'Church Conferences', 'Vow Renewals', 'Vendor Management'],
    languages: ['English'], accessibility: [],
    badges: ['claimed', 'christian_owned'], rating: 4.9, reviewCount: 62, recommendations: 170, views: 6800,
    claimed: true, verified: false, updatedDaysAgo: 30,
    foundedYear: 2017, serviceArea: 'Georgia statewide',
    social: { instagram: 'selahplans' },
    photos: [ph(320, 'Reception reveal'), ph(310, 'Church conference set'), ph(330, 'Planning binder, famous')],
    hours: { Mon: '9a–5p', Tue: '9a–5p', Wed: '9a–5p', Thu: '9a–7p', Fri: '9a–5p', Sat: 'Weddings', Sun: 'Rest' } as unknown as Record<string, string>,
    reviews: [
      r('Bride in Marietta', 5, 'Worth every penny', 'A vendor canceled two weeks out. Selah had a better one by Friday. My mother still talks about the timeline.', 14, true),
      r('Tabernacle women\u2019s ministry', 5, 'Our conference, handled', '450 women, 12 breakouts, zero fires. The famous binder is real.', 48, true),
    ],
    addedDaysAgo: 155, openNow: true, imageHue: 320,
  },

  {
    id: 'l37', slug: 'peach-state-insurance-advisors', name: 'Peach State Insurance Advisors', typeSlug: 'professional',
    tagline: 'Independent insurance advice — we work for you, not the carrier.',
    description: 'Independent agency comparing auto, home, life, and church-property policies across eight carriers. They explain coverages in plain English and will tell you when you are over-insured. Annual reviews for every client; church property packages a specialty.',
    city: 'Atlanta', region: 'GA', postalCode: '30310', lat: 33.735, lng: -84.415,
    phone: '(404) 555-0186', email: 'quotes@peachstateadvisors.example.com', website: 'https://example.com/peachstate', priceRange: '$',
    industries: ['insurance'], professions: ['insurance-agent'], denominations: ['church-of-christ'],
    hashtags: ['Insurance', 'Licensed', 'Atlanta', 'ChurchInsurance', 'LifeInsurance'],
    services: ['Auto & Home Bundles', 'Life Insurance', 'Church Property Packages', 'Annual Reviews', 'Claims Advocacy'],
    languages: ['English'], accessibility: ['Telehealth'],
    badges: ['claimed', 'christian_owned', 'professional_credential'], rating: 4.7, reviewCount: 91, recommendations: 210, views: 7600,
    claimed: true, verified: false, updatedDaysAgo: 32,
    foundedYear: 2012, serviceArea: 'Georgia statewide',
    social: { facebook: 'peachstateadvisors' },
    photos: [ph(140, 'The advisors\u2019 office'), ph(130, 'Church property review')],
    hours: { Mon: '8:30a–5p', Tue: '8:30a–5p', Wed: '8:30a–5p', Thu: '8:30a–6p', Fri: '8:30a–4p', Sat: 'By appointment', Sun: 'Closed' },
    reviews: [
      r('Deacon Marcus F.', 5, 'Saved our church $3,400/yr', 'Re-marketed our property policy and explained every exclusion. They told us one rider was a waste of money. We trust them.', 18, true),
      r('Single mom, two teens', 5, 'Told me to buy LESS', 'Who does that? An advisor who cut my bill 20% and added better life coverage for the kids.', 44, true),
    ],
    addedDaysAgo: 165, openNow: true, imageHue: 140,
  },

  {
    id: 'l38', slug: 'grace-fellowship-atlanta', name: 'Grace Fellowship Atlanta', typeSlug: 'church',
    tagline: 'Expository preaching & a famously good Sunday lunch table.',
    description: 'Verse-by-verse teaching Sunday mornings at Grant Park, with community groups across the city on weeknights. The lunch table after service is a local institution — bring nothing, stay an hour. Refugee resettlement team and a prison-letters ministry.',
    city: 'Atlanta', region: 'GA', postalCode: '30312', lat: 33.736, lng: -84.392,
    phone: '(404) 555-0148', email: 'info@gracefellowshipatl.example.com', website: 'https://example.com/gracefellowshipatl',
    industries: ['religious-organizations'], professions: ['pastor'], denominations: ['non-denominational'],
    hashtags: ['Church', 'Atlanta', 'ExpositoryPreaching', 'CommunityGroups', 'RefugeeSupport'],
    services: ['Sunday Worship', 'Community Groups', 'Refugee Resettlement', 'Prison Letters Ministry', 'Sunday Lunch Table'],
    languages: ['English'], accessibility: ['Wheelchair Access'],
    badges: ['church'], rating: 4.8, reviewCount: 88, recommendations: 230, views: 8100,
    claimed: false, verified: true, verificationMethod: 'review-team check', lastVerifiedDaysAgo: 10, updatedDaysAgo: 12,
    foundedYear: 2014, serviceArea: 'Grant Park and in-town Atlanta',
    photos: [ph(175, 'Sunday at Grant Park'), ph(165, 'The lunch table')],
    hours: { Sun: '10:30a worship & lunch after' } as unknown as Record<string, string>,
    reviews: [
      r('Newly arrived from Ohio', 5, 'Stayed for lunch, stayed for years', 'The preaching is deep and the table is longer than it looks. Found our people in one Sunday.', 10, true),
      r('Esperanza M.', 5, 'They showed up for our family', 'The refugee team furnished our first apartment in three days.', 40, true),
    ],
    addedDaysAgo: 12, openNow: false, imageHue: 175,
  },

  {
    id: 'l39', slug: 'lanier-landscaping', name: 'Lanier Landscaping & Lawns', typeSlug: 'business',
    tagline: 'Weekly lawn care & storm cleanup for intown Atlanta.',
    description: 'Family crew handling weekly maintenance, pine-straw, mulch, and storm cleanup from Decatur to West End. Fixed monthly pricing per lot size, text-ahead arrival windows, and free mowing for elderly widows on their street routes every other week.',
    city: 'Atlanta', region: 'GA', postalCode: '30317', lat: 33.812, lng: -84.29,
    phone: '(404) 555-0168', email: 'quote@lanierlawns.example.com', website: 'https://example.com/lanierlawns', priceRange: '$$',
    industries: ['home-services'], professions: ['landscaper'], denominations: ['non-denominational'],
    hashtags: ['Landscaping', 'LawnCare', 'Atlanta', 'ChristianOwned', 'FamilyOwned'],
    services: ['Weekly Maintenance', 'Pine Straw & Mulch', 'Storm Cleanup', 'Bush Trimming', 'Seasonal Color'],
    languages: ['English', 'Spanish'], accessibility: [],
    badges: ['claimed', 'christian_owned'], rating: 4.6, reviewCount: 57, recommendations: 130, views: 4900,
    claimed: true, verified: false, updatedDaysAgo: 21,
    foundedYear: 2018, serviceArea: 'Intown Atlanta: Decatur, Kirkwood, East Atlanta',
    social: { instagram: 'lanierlawns' },
    photos: [ph(110, 'Crisp edges on McLendon'), ph(100, 'Storm cleanup crew')],
    hours: { Mon: '7a–6p', Tue: '7a–6p', Wed: '7a–6p', Thu: '7a–6p', Fri: '7a–6p', Sat: '8a–1p', Sun: 'Closed' },
    reviews: [
      r('Mrs. Alice P.', 5, 'They take care of me', 'My late husband handled the yard for 40 years. Now Lanier does, at a price I can afford — and they will not take free. I bake them banana bread instead.', 17, true),
      r('Rob & Jenna S.', 4, 'Reliable crew', 'Text-ahead windows actually happen. Had to remind them once about a missed bush trim; no argument.', 50),
    ],
    addedDaysAgo: 21, openNow: true, imageHue: 110,
  },

  {
    id: 'l40', slug: 'faithful-hands-cleaning', name: 'Faithful Hands House Cleaning', typeSlug: 'business',
    tagline: 'Detail-obsessed house cleaning with the same two cleaners every visit.',
    description: 'Recurring residential cleaning across Decatur and east Atlanta. Same two-person team every visit, hospital-grade checklists, eco-friendly products, and a photo walkthrough when you are not home. Free deep-clean for families with new babies arriving home.',
    city: 'Atlanta', region: 'GA', postalCode: '30317', lat: 33.809, lng: -84.278,
    phone: '(404) 555-0114', email: 'book@faithfulhands.example.com', website: 'https://example.com/faithfulhands', priceRange: '$$',
    industries: ['home-services'], professions: ['house-cleaner'], denominations: ['non-denominational'],
    hashtags: ['HouseCleaning', 'Atlanta', 'ChristianOwned', 'EcoFriendly', 'FamilyOwned'],
    services: ['Recurring Cleaning', 'Move-in/Move-out', 'Deep Cleans', 'New-baby Welcome Clean', 'Eco Products'],
    languages: ['English', 'Spanish'], accessibility: [],
    badges: ['claimed', 'christian_owned'], rating: 4.9, reviewCount: 76, recommendations: 190, views: 5700,
    claimed: true, verified: true, verificationMethod: 'attestation + documents', lastVerifiedDaysAgo: 4, updatedDaysAgo: 2,
    foundedYear: 2021, serviceArea: 'Decatur, Oakhurst, East Atlanta',
    social: { instagram: 'faithfulhandsatl' },
    photos: [ph(60, 'Before & after kitchen'), ph(50, 'The same two faces every time')],
    hours: { Mon: '8a–5p', Tue: '8a–5p', Wed: '8a–5p', Thu: '8a–5p', Fri: '8a–4p', Sat: 'By appointment', Sun: 'Closed' },
    reviews: [
      r('Overwhelmed mom of 4', 5, 'The new-baby clean made me cry', 'Came home from the hospital to a spotless house and a freezer meal on the counter. I did not know a cleaning company did that.', 5, true),
      r('Chris & Dana V.', 5, 'Same team matters', 'No strangers cycling through. Rosa and Amy know our house and our dog by name.', 29, true),
    ],
    addedDaysAgo: 5, openNow: true, imageHue: 60,
  },

  // =============================== PHOENIX, AZ ===============================

  {
    id: 'l14', slug: 'sola-gratia-realty', name: 'Sola Gratia Realty — Miriam Chen', typeSlug: 'professional',
    tagline: 'Relocation & first-time-buyer specialist across the Valley.',
    description: 'Miriam Chen, licensed Realtor, helps families relocating for ministry and first-time buyers across Metro Phoenix. Evening and weekend showings, honest pricing analysis, and connections to Christian lenders offering financing guidance. Mandarin-speaking.',
    city: 'Phoenix', region: 'AZ', postalCode: '85004', lat: 33.45, lng: -112.07,
    phone: '(602) 555-0139', email: 'miriam@solagratia.example.com', website: 'https://example.com/solagratia', priceRange: '$$',
    industries: ['real-estate-property'], professions: ['realtor'], denominations: ['calvary-chapel'],
    hashtags: ['Realtor', 'Licensed', 'Phoenix', 'FinancingAvailable', 'Evangelical', 'Mandarin'],
    services: ['Buyer Representation', 'Relocation', 'First-time Buyers', 'Listing Services', 'Lender Referrals'],
    languages: ['English', 'Mandarin'], accessibility: ['Evening & weekend showings'],
    badges: ['claimed', 'christian_owned', 'professional_credential'], rating: 4.8, reviewCount: 91, recommendations: 240, views: 9100,
    claimed: true, verified: true, verificationMethod: 'credential check with issuer', lastVerifiedDaysAgo: 24, updatedDaysAgo: 24,
    foundedYear: 2015, serviceArea: 'Metro Phoenix: Phoenix, Tempe, Mesa, Glendale',
    social: { linkedin: 'sola-gratia-realty', instagram: 'solagratiaaz' },
    photos: [ph(15, 'Camelback East listing'), ph(25, 'Key handoff')],
    hours: { Mon: '9a–7p', Tue: '9a–7p', Wed: '9a–7p', Thu: '9a–7p', Fri: '9a–6p', Sat: '10a–5p', Sun: 'Afternoons' },
    reviews: [
      r('Pastoral family, relocating', 5, 'They understand ministry moves', 'Found us a house with a casita for visiting parents, inside our small budget, sight-unseen. Everything checked out.', 13, true),
      r('First-time buyers, Mesa', 5, 'Patient through our panic', 'Explained inspection reports line by line. Never pushed. We love our home.', 46, true),
    ],
    addedDaysAgo: 110, openNow: true, imageHue: 15,
  },

  {
    id: 'l16', slug: 'good-samaritan-auto', name: 'Good Samaritan Auto Care', typeSlug: 'business',
    tagline: 'Honest auto repair — free inspections for single moms & widows.',
    description: 'Full-service repair shop in Melrose District: diagnostics, brakes, tires, and pre-purchase inspections. Every invoice explained in plain language with the parts on the counter. Shuttle service, financing, and a standing offer: free safety inspections for single moms and widows.',
    city: 'Phoenix', region: 'AZ', postalCode: '85013', lat: 33.502, lng: -112.081,
    phone: '(602) 555-0122', email: 'service@goodsamaritanauto.example.com', website: 'https://example.com/goodsamaritan', priceRange: '$$',
    industries: ['automotive'], professions: ['auto-mechanic'], denominations: ['vineyard'],
    hashtags: ['AutoRepair', 'ChristianOwned', 'FinancingAvailable', 'FamilyOwned', 'Phoenix'],
    services: ['Diagnostics', 'Brakes', 'Tires', 'A/C Service (it is Phoenix)', 'Pre-purchase Inspections'],
    languages: ['English', 'Spanish'], accessibility: ['Wheelchair Access', 'Shuttle service'],
    badges: ['claimed', 'christian_owned'], rating: 4.8, reviewCount: 176, recommendations: 390, views: 12900,
    claimed: true, verified: true, verificationMethod: 'attestation + documents', lastVerifiedDaysAgo: 14, updatedDaysAgo: 14,
    foundedYear: 2010, serviceArea: 'Central Phoenix; shuttle within 8 miles',
    social: { facebook: 'goodsamaritanauto', instagram: 'goodsamaritanauto' },
    photos: [ph(195, 'Counter with your old parts'), ph(205, 'Five bays'), ph(185, 'Free inspection morning')],
    hours: { Mon: '7:30a–5:30p', Tue: '7:30a–5:30p', Wed: '7:30a–5:30p', Thu: '7:30a–5:30p', Fri: '7:30a–5:30p', Sat: '8a–1p', Sun: 'Closed' },
    reviews: [
      r('Widow, 79, on fixed income', 5, 'They kept my car safe for free', 'Inspection, wipers, and a brake check at no charge, plus they drove me home. First Saturday of every month, they say. Bless them.', 8, true),
      r('Jordan P.', 5, 'Parts on the counter', 'Showed me the eaten brake pads before I paid. Invoice matched the quote exactly. A/C blowing cold again.', 27, true, 'Jordan, thanks for trusting us with the Camry. Stay cool out there.'),
    ],
    addedDaysAgo: 140, openNow: true, imageHue: 195,
  },

  {
    id: 'l41', slug: 'radiant-roots-salon', name: 'Radiant Roots Salon', typeSlug: 'business',
    tagline: 'Clean-beauty salon with a quiet-chair option.',
    description: 'Stylists specializing in curly cuts, vivid color, and gentle gray coverage using low-tox products. The famous quiet-chair option: a full appointment with no small talk, marked on your booking. A foster-care partnership gives free back-to-school cuts to placement kids.',
    city: 'Phoenix', region: 'AZ', postalCode: '85020', lat: 33.545, lng: -112.071,
    phone: '(602) 555-0178', email: 'book@radiantroots.example.com', website: 'https://example.com/radiantroots', priceRange: '$$',
    industries: ['beauty-personal-care'], professions: ['hairstylist'], denominations: ['non-denominational'],
    hashtags: ['Salon', 'Phoenix', 'CurlyHair', 'CleanBeauty', 'ChristianOwned', 'FosterCare'],
    services: ['Curly Cuts', 'Vivid Color', 'Gray Coverage', 'Quiet-chair Appointments', 'Back-to-school Cuts'],
    languages: ['English', 'Spanish'], accessibility: ['Wheelchair Access'],
    badges: ['claimed', 'christian_owned'], rating: 4.8, reviewCount: 128, recommendations: 300, views: 10800,
    claimed: true, verified: true, verificationMethod: 'attestation + documents', lastVerifiedDaysAgo: 33, updatedDaysAgo: 23,
    foundedYear: 2018, serviceArea: 'North Central Phoenix',
    social: { instagram: 'radiantrootssalon' },
    photos: [ph(330, 'Curly cut before/after'), ph(320, 'The quiet chair'), ph(340, 'Back-to-school cut day')],
    hours: { Tue: '9a–6p', Wed: '9a–6p', Thu: '10a–7p', Fri: '9a–6p', Sat: '8a–4p', Mon: 'Closed', Sun: 'Closed' },
    reviews: [
      r('Introvert, diagnosed', 5, 'The quiet chair changed salon days for me', 'Booked it, loved it, left refreshed instead of drained. Genius.', 12, true),
      r('Foster mom of 3', 5, 'Back-to-school cuts with dignity', 'The stylists made each kid feel like the main character. Free, unhurried, kind.', 34, true),
    ],
    addedDaysAgo: 128, openNow: true, imageHue: 330,
  },

  {
    id: 'l42', slug: 'desert-springs-church', name: 'Desert Springs Church', typeSlug: 'church',
    tagline: 'Bible-teaching church with a heart for the Valley.',
    description: 'Sunday services at 8:30, 10:15, and noon with full kids program and student ministry. Known for careful Bible teaching, a large Spanish-speaking congregation, and the annual citywide serve weekend that repaints schools and repairs widow-owned homes.',
    city: 'Phoenix', region: 'AZ', postalCode: '85016', lat: 33.487, lng: -112.043,
    phone: '(602) 555-0102', email: 'office@desertspringsaz.example.com', website: 'https://example.com/desertsprings',
    industries: ['religious-organizations'], professions: ['pastor'], denominations: ['non-denominational'],
    hashtags: ['Church', 'Phoenix', 'BibleTeaching', 'SpanishSpeaking', 'ServeWeekend'],
    services: ['Sunday Worship', 'Kids Program', 'Student Ministry', 'Congregaci\u00f3n en Espa\u00f1ol', 'City Serve Weekend'],
    languages: ['English', 'Spanish'], accessibility: ['Wheelchair Access', 'ASL Interpretation (10:15)'],
    badges: ['claimed', 'church'], rating: 4.8, reviewCount: 264, recommendations: 620, views: 21800,
    featured: true, claimed: true, verified: true, verificationMethod: 'review-team check', lastVerifiedDaysAgo: 19, updatedDaysAgo: 19,
    foundedYear: 1985, serviceArea: 'Central Phoenix',
    social: { facebook: 'desertspringsaz', youtube: 'desertspringsaz', instagram: 'desertspringsaz' },
    photos: [ph(170, 'Sunday worship'), ph(160, 'Serve weekend crew'), ph(180, 'Kids check-in')],
    hours: { Sun: '8:30a, 10:15a & 12p', Wed: '7p students' } as unknown as Record<string, string>,
    reviews: [
      r('Serve weekend volunteer', 5, 'We painted seven schools', 'Organized like a construction firm, joyful like a family reunion. The city noticed.', 20, true),
      r('Marisol D.', 5, 'La congregaci\u00f3n en espa\u00f1ol', 'Ense\u00f1anza firme y comunidad verdadera. Nuestros ni\u00f1os crecen aqu\u00ed.', 42, true),
    ],
    addedDaysAgo: 380, openNow: false, imageHue: 170,
  },

  {
    id: 'l43', slug: 'sonrise-breakfast-house', name: 'Sonrise Breakfast House', typeSlug: 'business',
    tagline: 'From-scratch breakfast & brunch in a converted bungalow.',
    description: 'Breakfast house on Seventh Street: buttermilk biscuits, chorizo hash, and the famous cinnamon-swirl pancakes. Everything made from scratch each morning; the pastry case benefits the youth homeless shelter next door. Patio is dog-friendly — misters added, pray for shade anyway.',
    city: 'Phoenix', region: 'AZ', postalCode: '85014', lat: 33.521, lng: -112.068,
    phone: '(602) 555-0150', email: 'hello@sonrisebreakfast.example.com', website: 'https://example.com/sonrisebreakfast', priceRange: '$$',
    industries: ['food-beverage'], professions: ['restaurant-owner'], denominations: ['non-denominational'],
    hashtags: ['Restaurant', 'Breakfast', 'Phoenix', 'ChristianOwned', 'DogFriendly'],
    services: ['Breakfast & Brunch', 'Fresh Pastries', 'Patio Dining', 'Takeout', 'Catering Trays'],
    languages: ['English', 'Spanish'], accessibility: ['Wheelchair Access', 'Dog-friendly patio'],
    badges: ['claimed', 'christian_owned'], rating: 4.7, reviewCount: 342, recommendations: 720, views: 26300,
    featured: true, claimed: true, verified: true, verificationMethod: 'attestation + documents', lastVerifiedDaysAgo: 5, updatedDaysAgo: 7,
    foundedYear: 2017, serviceArea: 'Central Phoenix',
    social: { instagram: 'sonrisebreakfast', facebook: 'sonrisebreakfast' },
    photos: [ph(40, 'The biscuit board'), ph(30, 'Misted patio'), ph(50, 'Pastry case proceeds')],
    hours: { Mon: '6:30a–2p', Tue: '6:30a–2p', Wed: '6:30a–2p', Thu: '6:30a–2p', Fri: '6:30a–2p', Sat: '7a–3p', Sun: '7a–3p' },
    reviews: [
      r('Biscuit evangelist', 5, 'Best biscuits in the Valley', 'Flaky, buttery, enormous. Get the biscuit board and thank me later. Wait on Sundays is real — go early.', 10, true),
      r('Shelter volunteer next door', 5, 'Neighbors in every sense', 'Their pastry case funded our hygiene kits all year. Eat here twice as much.', 38, true),
    ],
    addedDaysAgo: 8, openNow: true, imageHue: 40,
  },

  {
    id: 'l44', slug: 'valley-computer-pros', name: 'Valley Computer Pros', typeSlug: 'business',
    tagline: 'Patient computer help for homes & small offices.',
    description: 'On-site and remote IT support across the Valley: slow-laptop rescues, printer exorcisms, small-office networks, and scam-recovery help for seniors — first hour free for anyone over 70. They explain everything twice and never make you feel silly.',
    city: 'Phoenix', region: 'AZ', postalCode: '85018', lat: 33.493, lng: -111.997,
    phone: '(602) 555-0166', email: 'help@valleycomputerpros.example.com', website: 'https://example.com/valleycomputer', priceRange: '$',
    industries: ['information-technology'], professions: ['it-support'], denominations: ['non-denominational'],
    hashtags: ['ITSupport', 'Phoenix', 'ChristianOwned', 'SeniorDiscount', 'RemoteSupport'],
    services: ['Computer Repair', 'Small-office Networks', 'Remote Support', 'Scam Recovery', 'Data Backup'],
    languages: ['English'], accessibility: ['Telehealth', 'On-site visits'],
    badges: ['claimed', 'christian_owned'], rating: 4.7, reviewCount: 63, recommendations: 150, views: 5100,
    claimed: true, verified: true, verificationMethod: 'attestation + documents', lastVerifiedDaysAgo: 45, updatedDaysAgo: 17,
    foundedYear: 2019, serviceArea: 'Metro Phoenix; remote support nationwide',
    social: { facebook: 'valleycomputerpros' },
    photos: [ph(240, 'Workshop bench'), ph(250, 'Senior tech-help morning')],
    hours: { Mon: '8a–6p', Tue: '8a–6p', Wed: '8a–6p', Thu: '8a–6p', Fri: '8a–5p', Sat: '9a–1p', Sun: 'Closed' },
    reviews: [
      r('Grandson of a satisfied client', 5, 'They saved Grandma from a scam', 'Recovered her files, secured her accounts, and spent an extra hour teaching her the warning signs. First hour really was free.', 15, true),
      r('Small law office, Arcadia', 4, 'Network finally stable', 'Straight answers, fair hourly rate, invoices that make sense.', 53),
    ],
    addedDaysAgo: 17, openNow: true, imageHue: 240,
  },

  {
    id: 'l45', slug: 'desert-palm-property-management', name: 'Desert Palm Property Management', typeSlug: 'professional',
    tagline: 'Ethical property management for small landlords.',
    description: 'Full-service management for single-family homes and small multifamily across the Valley: tenant screening done fairly, maintenance handled fast, and owner statements a human explains monthly. They will tell you when renting is a bad idea — in writing.',
    city: 'Phoenix', region: 'AZ', postalCode: '85008', lat: 33.466, lng: -112.051,
    phone: '(602) 555-0192', email: 'owners@desertpalmaz.example.com', website: 'https://example.com/desertpalm', priceRange: '$$',
    industries: ['real-estate-property'], professions: ['property-manager'], denominations: ['non-denominational'],
    hashtags: ['PropertyManagement', 'Licensed', 'Phoenix', 'ChristianOwned', 'SmallLandlords'],
    services: ['Tenant Screening', 'Rent Collection', 'Maintenance Coordination', 'Monthly Statements', 'Lease-ups'],
    languages: ['English', 'Spanish'], accessibility: [],
    badges: ['claimed', 'christian_owned'], rating: 4.6, reviewCount: 48, recommendations: 110, views: 4200,
    claimed: true, verified: false, updatedDaysAgo: 40,
    foundedYear: 2016, serviceArea: 'Phoenix, Tempe, Mesa, Chandler',
    social: { linkedin: 'desert-palm-property' },
    photos: [ph(65, 'Managed property tour'), ph(75, 'Owner statement sample')],
    hours: { Mon: '8a–5p', Tue: '8a–5p', Wed: '8a–5p', Thu: '8a–5p', Fri: '8a–4p', Sat: 'Closed', Sun: 'Closed' },
    reviews: [
      r('Reluctant landlord', 5, 'Told me NOT to rent my house', 'Ran the numbers, showed me I would lose money monthly, and said sell instead. Then they managed my OTHER property flawlessly.', 22, true),
      r('Tenant (yes, tenants review too)', 4, 'Repairs actually happen', 'A/C fixed in one day in July. That is all you need to know.', 49, true),
    ],
    addedDaysAgo: 28, openNow: true, imageHue: 65,
  },

  // ========================== COLORADO SPRINGS, CO ==========================

  {
    id: 'l11', slug: 'mustard-seed-academy', name: 'Mustard Seed Christian Academy', typeSlug: 'school',
    tagline: 'Classical Christian K–8 with joyful rigor & small classes.',
    description: 'Accredited classical Christian school at the foot of Cheyenne Mountain: phonics-rich grammar stage, Latin from 3rd grade, daily chapel, and competitive athletics. Average class size of 14. Tuition assistance available; homeschool hybrid track on Fridays.',
    city: 'Colorado Springs', region: 'CO', postalCode: '80906', lat: 38.792, lng: -104.835,
    phone: '(719) 555-0112', email: 'admissions@mustardseedca.example.com', website: 'https://example.com/mustardseed', priceRange: '$$$',
    industries: ['education'], professions: ['private-school'], denominations: ['pca'],
    hashtags: ['School', 'Presbyterian', 'ColoradoSprings', 'ClassicalEducation', 'Accredited'],
    services: ['K–8 Education', 'Preschool', 'Homeschool Hybrid', 'Athletics', 'Summer Camps'],
    languages: ['English'], accessibility: ['Wheelchair Access'],
    badges: ['claimed', 'christian_owned'], rating: 4.8, reviewCount: 119, recommendations: 330, views: 10500,
    featured: true, claimed: true, verified: true, verificationMethod: 'attestation + documents', lastVerifiedDaysAgo: 32, updatedDaysAgo: 32,
    foundedYear: 2008, serviceArea: 'Colorado Springs and Broadmoor area',
    social: { facebook: 'mustardseedca' },
    photos: [ph(95, 'Chapel morning'), ph(105, 'Latin class, 4th grade'), ph(85, 'Cross-country at the mountain')],
    hours: { 'Mon–Fri': '8a–3:15p school days', Fri: '+ hybrid track' } as unknown as Record<string, string>,
    statementOfFaith: 'Reformed and evangelical: the Westminster Standards summarized for families, grace-centered discipline, and parents as primary disciplers.',
    reviews: [
      r('Homeschool-to-hybrid family', 5, 'The Friday hybrid saved us', 'Structure where we needed it, freedom where we did not. Teachers treat parents as partners, not problems.', 18, true),
      r('Military family, PCS\u2019d twice', 5, 'Continuity across moves', 'Our kids re-entered smoothly after a cross-country move. The classical sequence meant no gaps.', 57, true),
    ],
    addedDaysAgo: 180, openNow: false, imageHue: 95,
  },

  {
    id: 'l13', slug: 'redeemer-orthodox-mission', name: 'Redeemer Orthodox Mission Parish', typeSlug: 'church',
    tagline: 'Ancient faith in the modern city — all inquirers welcome.',
    description: 'English-language Orthodox mission near downtown: Saturday Vespers, Sunday Divine Liturgy, catechism classes, and a lending library. Monthly come-and-see newcomers\u2019 lunch where every question is welcome — including the hard ones.',
    city: 'Colorado Springs', region: 'CO', postalCode: '80903', lat: 38.828, lng: -104.822,
    phone: '(719) 555-0161', email: 'welcome@redeemerocs.example.com', website: 'https://example.com/redeemer',
    industries: ['religious-organizations'], professions: ['pastor'], denominations: ['orthodox-church-in-america'],
    hashtags: ['Orthodox', 'Church', 'ColoradoSprings', 'BibleStudy', 'NewcomersWelcome'],
    services: ['Divine Liturgy', 'Vespers', 'Catechism', 'Lending Library', 'Newcomers\u2019 Lunch'],
    languages: ['English'], accessibility: ['Wheelchair Access'],
    badges: ['church'], rating: 4.9, reviewCount: 58, recommendations: 190, views: 5600,
    claimed: false, verified: true, verificationMethod: 'review-team check', lastVerifiedDaysAgo: 43, updatedDaysAgo: 29,
    foundedYear: 2012, serviceArea: 'Downtown Colorado Springs',
    photos: [ph(250, 'Divine Liturgy'), ph(240, 'The lending library')],
    hours: { Sat: '6p Vespers', Sun: '9:30a Liturgy' } as unknown as Record<string, string>,
    statementOfFaith: 'We confess the Nicene-Constantinopolitan Creed and the faith of the undivided Church.',
    reviews: [
      r('Curious Protestant', 5, 'They answered everything', 'Came with a notebook of questions, left with a calendar of feast days. No pressure, just hospitality and history.', 14, true),
      r('Catechumen, month two', 5, 'The newcomers lunch is real', 'Six visitors, one priest, two hours of honest conversation. Fr. Ambrose remembers every name.', 47, true),
    ],
    addedDaysAgo: 75, openNow: false, imageHue: 250,
  },

  {
    id: 'l46', slug: 'summit-view-counseling', name: 'Summit View Counseling', typeSlug: 'counselor',
    tagline: 'Faith-friendly therapy for military families & first responders.',
    description: 'Group practice near Memorial Park: licensed therapists offering trauma recovery (EMDR), marriage work, and teen anxiety care. Faith is integrated when clients want it and respected when they do not. Tricare and most insurance accepted; sliding scale every Thursday.',
    city: 'Colorado Springs', region: 'CO', postalCode: '80909', lat: 38.822, lng: -104.789,
    phone: '(719) 555-0184', email: 'schedule@summitviewco.example.com', website: 'https://example.com/summitview', priceRange: '$$',
    industries: ['healthcare-wellness'], professions: ['christian-counselor', 'psychologist'], denominations: ['non-denominational'],
    hashtags: ['Counselor', 'Licensed', 'ColoradoSprings', 'MilitaryFamilies', 'EMDR', 'Tricare'],
    services: ['EMDR & Trauma Recovery', 'Marriage Counseling', 'Teen Anxiety', 'Deployment Stress', 'Sliding-scale Thursdays'],
    languages: ['English'], accessibility: ['Wheelchair Access', 'Telehealth', 'Evening appointments'],
    badges: ['claimed', 'christian_owned', 'professional_credential'], rating: 4.9, reviewCount: 103, recommendations: 270, views: 9200,
    claimed: true, verified: true, verificationMethod: 'credential check with issuer', lastVerifiedDaysAgo: 13, updatedDaysAgo: 13,
    foundedYear: 2016, serviceArea: 'Colorado Springs; telehealth across Colorado',
    social: { linkedin: 'summit-view-counseling' },
    photos: [ph(195, 'Quiet office near Memorial Park'), ph(205, 'Play-therapy room')],
    hours: { Mon: '8a–7p', Tue: '8a–7p', Wed: '8a–7p', Thu: '8a–7p (sliding scale)', Fri: '8a–4p', Sat: 'By appointment', Sun: 'Closed' },
    reviews: [
      r('Army spouse', 5, 'They speak deployment', 'Understood the calendar, the kids, and the fear without me explaining. EMDR sessions changed our marriage\u2019s trajectory.', 10, true),
      r('Teen client\u2019s dad', 5, 'Our son talks again', 'After two years of silence, he has words. Thursday sliding scale made it possible for our budget.', 36, true),
    ],
    addedDaysAgo: 25, openNow: true, imageHue: 195,
  },

  {
    id: 'l47', slug: 'the-lamplighter-bookshop', name: 'The Lamplighter Bookshop', typeSlug: 'business',
    tagline: 'Independent bookshop — theology, classics & a kids\u2019 story hour.',
    description: 'Two floors of new and used books downtown: thoughtful theology, classics, local history, and the region\u2019s best kids\u2019 section. Saturday story hour at 10, monthly classics club, and special orders arrive in three days. They will hunt down any out-of-print title.',
    city: 'Colorado Springs', region: 'CO', postalCode: '80903', lat: 38.833, lng: -104.826,
    phone: '(719) 555-0127', email: 'reads@lamplighterbooks.example.com', website: 'https://example.com/lamplighter', priceRange: '$',
    industries: ['retail'], professions: ['boutique-owner'], denominations: ['non-denominational'],
    hashtags: ['Bookshop', 'ColoradoSprings', 'Theology', 'Kids', 'Independent'],
    services: ['New & Used Books', 'Special Orders', 'Saturday Story Hour', 'Classics Club', 'Out-of-print Hunts'],
    languages: ['English'], accessibility: ['Wheelchair Access'],
    badges: ['claimed', 'christian_owned'], rating: 4.9, reviewCount: 147, recommendations: 350, views: 11400,
    claimed: true, verified: true, verificationMethod: 'attestation + documents', lastVerifiedDaysAgo: 22, updatedDaysAgo: 22,
    foundedYear: 2013, serviceArea: 'Downtown Colorado Springs',
    social: { instagram: 'lamplighterbooks', facebook: 'lamplighterbooks' },
    photos: [ph(285, 'The kids\u2019 loft'), ph(275, 'Saturday story hour'), ph(295, 'Theology wall')],
    hours: { Mon: '10a–6p', Tue: '10a–6p', Wed: '10a–6p', Thu: '10a–7p', Fri: '10a–7p', Sat: '9a–5p', Sun: '12p–4p' },
    reviews: [
      r('Story hour regular', 5, 'Saturday mornings, sorted', 'The staff know every regular kid by name and reading level. Special orders arrive like magic — three days, always.', 13, true),
      r('Seminary student', 5, 'Out-of-print hunt succeeded', 'Found a 1952 printing of a commentary I needed for my thesis. Fair price, beautiful condition.', 41, true),
    ],
    addedDaysAgo: 195, openNow: true, imageHue: 285,
  },

  {
    id: 'l48', slug: 'cheyenne-mountain-roasters', name: 'Cheyenne Mountain Roasters', typeSlug: 'business',
    tagline: 'Small-batch coffee roastery with honest sourcing.',
    description: 'Family roastery roasting Tuesdays and Fridays: single-origin beans with published farm names and prices paid, espresso drinks, and beans for home brewers. Subscribe online or buy at the counter — the 12 oz bag price is the same either way, on principle.',
    city: 'Colorado Springs', region: 'CO', postalCode: '80906', lat: 38.795, lng: -104.812,
    phone: '(719) 555-0145', email: 'beans@cheyenneroasters.example.com', website: 'https://example.com/cheyennroasters', priceRange: '$',
    industries: ['food-beverage'], professions: ['coffee-shop'], denominations: ['non-denominational'],
    hashtags: ['Coffee', 'Roastery', 'ColoradoSprings', 'ChristianOwned', 'FairSourcing'],
    services: ['Fresh-roasted Beans', 'Espresso Bar', 'Subscriptions', 'Wholesale for Churches', 'Cupping Classes'],
    languages: ['English'], accessibility: ['Ground-level entry'],
    badges: ['claimed', 'christian_owned'], rating: 4.8, reviewCount: 92, recommendations: 220, views: 7800,
    claimed: true, verified: false, updatedDaysAgo: 30,
    foundedYear: 2019, serviceArea: 'Colorado Springs; shipping nationwide',
    social: { instagram: 'cheyennoroasters' },
    photos: [ph(28, 'Roast day'), ph(38, 'Single-origin wall'), ph(18, 'Cupping class')],
    hours: { Mon: '6:30a–4p', Tue: '6:30a–4p', Wed: '6:30a–4p', Thu: '6:30a–4p', Fri: '6:30a–5p', Sat: '7a–3p', Sun: 'Closed' },
    reviews: [
      r('Home barista', 5, 'Farm names on the bag', 'They publish what they pay farmers. The Ethiopia tastes like blueberries and integrity.', 9, true),
      r('Church coffee volunteer', 4, 'Our Sunday coffee upgraded', 'Wholesale program for churches is straightforward and the beans are always fresh. Grumpy deacons cured.', 52, true, 'Ha! Glad the fellowship hall is happy. Refills are on the house next roast.'),
    ],
    addedDaysAgo: 230, openNow: true, imageHue: 28,
  },

  // ============================== ONLINE-ONLY ==============================

  {
    id: 'l15', slug: 'city-on-a-hill-podcast', name: 'City on a Hill Podcast', typeSlug: 'online-ministry',
    tagline: 'Weekly conversations on faith, work & city renewal.',
    description: 'A digital-first ministry featuring pastors, founders, and artists across traditions. 200+ episodes, discussion guides for small groups, and a monthly live Q&A. Listened to in 40 states; the Dallas live show sells out the bakery loft every month.',
    city: 'Dallas', region: 'TX', isOnlineOnly: true,
    email: 'hello@cityonahill.example.com', website: 'https://example.com/cityonahill',
    industries: ['arts-media-entertainment', 'religious-organizations'], professions: ['media-producer'], denominations: ['non-denominational'],
    hashtags: ['OnlineMinistry', 'Podcast', 'OnlineServices', 'BibleStudy', 'FaithAndWork'],
    services: ['Weekly Podcast', 'Small-group Guides', 'Live Q&A', 'Dallas Live Show'],
    languages: ['English'], accessibility: ['Transcripts for every episode'],
    badges: ['claimed', 'ministry'], rating: 4.7, reviewCount: 203, recommendations: 470, views: 19800,
    claimed: true, verified: true, verificationMethod: 'review-team check', lastVerifiedDaysAgo: 23, updatedDaysAgo: 23,
    foundedYear: 2020, serviceArea: 'Online; live show in Dallas',
    social: { instagram: 'cityonahillpod', x: 'cityonahillpod', youtube: 'cityonahillpod' },
    photos: [ph(285, 'Recording night'), ph(275, 'Dallas live show')],
    reviews: [
      r('Small-group leader', 5, 'The discussion guides actually work', 'Our group of eight has real conversations every week. The faith-and-work episodes opened doors I could not.', 16, true),
      r('Dallas live-show regular', 5, 'Better than Netflix', 'Monthly live recordings in the bakery loft with pie. The Q&A is worth the ticket alone.', 44, true),
    ],
    addedDaysAgo: 25, openNow: true, imageHue: 285,
  },

  {
    id: 'l49', slug: 'anchor-web-studio', name: 'Anchor Web Studio', typeSlug: 'business',
    tagline: 'Websites for small businesses & ministries — flat pricing, no jargon.',
    description: 'Husband-and-wife web studio building fast, accessible sites for trades, restaurants, churches, and nonprofits. Flat project pricing published on the site ($2,400 for most small-business sites), you own everything, and they train you to update it yourself.',
    city: 'Colorado Springs', region: 'CO', lat: 38.846, lng: -104.8, isOnlineOnly: true,
    phone: '(719) 555-0198', email: 'projects@anchorweb.example.com', website: 'https://example.com/anchorweb', priceRange: '$$',
    industries: ['information-technology'], professions: ['web-developer'], denominations: ['non-denominational'],
    hashtags: ['WebDesign', 'OnlineServices', 'ChristianOwned', 'TransparentPricing', 'SmallBusiness'],
    services: ['Small-business Websites', 'Church & Nonprofit Sites', 'Site Rescue', 'Training', 'Hosting Setup'],
    languages: ['English'], accessibility: ['Telehealth', 'WCAG-minded builds'],
    badges: ['claimed', 'christian_owned'], rating: 4.9, reviewCount: 37, recommendations: 90, views: 3100,
    claimed: true, verified: true, verificationMethod: 'attestation + documents', lastVerifiedDaysAgo: 2, updatedDaysAgo: 3,
    foundedYear: 2021, serviceArea: 'Online — clients in 12 states',
    social: { instagram: 'anchorwebstudio' },
    photos: [ph(235, 'Recent build for a roofer'), ph(245, 'Training call')],
    reviews: [
      r('Roofer with a bad old site', 5, 'Our site finally loads fast', 'Flat price, three weeks, and a training video so we stop paying for typo fixes. Exactly what was promised.', 7, true),
      r('Food bank director', 5, 'They donate one site per quarter', 'Ours was the Q2 gift site. Professional, accessible, and translated our chaos into clarity.', 31, true),
    ],
    addedDaysAgo: 3, openNow: true, imageHue: 235,
  },

  {
    id: 'l50', slug: 'daily-bread-devotionals', name: 'Daily Bread Devotionals', typeSlug: 'author',
    tagline: 'Short daily devotionals for busy, honest readers.',
    description: 'A small writing ministry publishing a free daily devotional email (12,000 subscribers) and three print collections. Written by a retired pastor and his editor daughter. No paywalls, no guilt-trip fundraising letters — one quiet annual appeal.',
    city: 'Nashville', region: 'TN', lat: 36.13, lng: -86.75, isOnlineOnly: true,
    email: 'hello@dailybreaddevos.example.com', website: 'https://example.com/dailybread',
    industries: ['publishing', 'religious-organizations'], professions: ['author', 'publisher'], denominations: ['non-denominational'],
    hashtags: ['Devotionals', 'OnlineMinistry', 'OnlineServices', 'Books', 'Email'],
    services: ['Daily Devotional Email', 'Print Collections', 'Advent & Lent Guides', 'Small-group Prompts'],
    languages: ['English'], accessibility: ['Large-print editions', 'Screen-reader friendly emails'],
    badges: ['ministry'], rating: 4.9, reviewCount: 168, recommendations: 390, views: 15200,
    claimed: false, verified: true, verificationMethod: 'review-team check', lastVerifiedDaysAgo: 12, updatedDaysAgo: 14,
    foundedYear: 2015, serviceArea: 'Online',
    photos: [ph(50, 'The desk where it happens'), ph(40, 'Print collection')],
    reviews: [
      r('Night-shift nurse', 5, 'Twelve minutes of truth at 3 AM', 'I read it on break. Short, honest, never sappy. It has carried me through a hard year.', 11, true),
      r('Sunday school teacher', 5, 'The Advent guide anchored our class', 'Clear prompts, zero fluff. Our best-attended season in a decade.', 59, true),
    ],
    addedDaysAgo: 14, openNow: true, imageHue: 50,
  },
];

export const listingBySlug = (slug: string) => SAMPLE_LISTINGS.find((l) => l.slug === slug);
export const listingById = (id: string) => SAMPLE_LISTINGS.find((l) => l.id === id);

/** Listings verified within the last N days — used for live homepage metrics. */
export const verifiedCount = () => SAMPLE_LISTINGS.filter((l) => l.verified).length;
export const recentCount = (days = 30) => SAMPLE_LISTINGS.filter((l) => l.addedDaysAgo <= days).length;
