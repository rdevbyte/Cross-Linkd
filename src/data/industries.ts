/**
 * Industry → Category → Subcategory → Profession → Service taxonomy.
 * Normalized: unique slugs, industries separated from professions,
 * multi-level relationships, expandable without redesign.
 */
export interface Profession { slug: string; name: string; aliases?: string[]; requiresLicense?: boolean; services?: string[]; }
export interface Category { slug: string; name: string; professions: Profession[]; }
export interface Industry { slug: string; name: string; description: string; categories: Category[]; }

export const INDUSTRIES: Industry[] = [
  {
    slug: 'financial-services', name: 'Financial Services',
    description: 'Banking, insurance, investing, and stewardship-minded financial guidance.',
    categories: [
      { slug: 'accounting-tax', name: 'Accounting & Tax', professions: [
        { slug: 'cpa', name: 'Certified Public Accountant', aliases: ['CPA', 'Accountant'], requiresLicense: true, services: ['Tax preparation', 'Bookkeeping', 'Audits', 'Business advisory'] },
        { slug: 'financial-advisor', name: 'Financial Advisor', aliases: ['Financial Planner'], requiresLicense: true, services: ['Retirement planning', 'Faith-based investing', 'Estate planning'] },
      ]},
      { slug: 'insurance', name: 'Insurance', professions: [
        { slug: 'insurance-agent', name: 'Insurance Agent', requiresLicense: true, services: ['Life insurance', 'Health sharing plans', 'Business insurance'] },
      ]},
      { slug: 'mortgage-lending', name: 'Mortgage & Lending', professions: [
        { slug: 'mortgage-broker', name: 'Mortgage Broker', requiresLicense: true, services: ['Home loans', 'Refinancing', 'Church facility financing'] },
      ]},
    ],
  },
  {
    slug: 'professional-business-services', name: 'Professional & Business Services',
    description: 'Consulting, legal support, marketing, and back-office services.',
    categories: [
      { slug: 'consulting', name: 'Consulting', professions: [
        { slug: 'business-consultant', name: 'Business Consultant', services: ['Strategy', 'Operations', 'Nonprofit consulting'] },
        { slug: 'business-coach', name: 'Business Coach', services: ['Leadership coaching', 'Executive coaching'] },
      ]},
      { slug: 'marketing', name: 'Marketing & Creative', professions: [
        { slug: 'marketing-agency', name: 'Marketing Agency', services: ['Branding', 'Church communications', 'Social media'] },
        { slug: 'graphic-designer', name: 'Graphic Designer', aliases: ['Designer'], services: ['Logo design', 'Sermon graphics', 'Print design'] },
      ]},
    ],
  },
  {
    slug: 'information-technology', name: 'Information Technology',
    description: 'Software, IT support, and church technology services.',
    categories: [
      { slug: 'software', name: 'Software & Web', professions: [
        { slug: 'web-developer', name: 'Web Developer', aliases: ['Developer'], services: ['Church websites', 'E-commerce', 'Web apps'] },
        { slug: 'it-support', name: 'IT Support Specialist', services: ['Managed IT', 'Network setup', 'Livestream tech'] },
      ]},
      { slug: 'church-media', name: 'Church Media & Production', professions: [
        { slug: 'media-producer', name: 'Media Producer', services: ['Livestream production', 'Video editing', 'Sound engineering'] },
      ]},
    ],
  },
  {
    slug: 'construction-skilled-trades', name: 'Construction & Skilled Trades',
    description: 'Builders, remodelers, and licensed trades serving homes and churches.',
    categories: [
      { slug: 'electrical', name: 'Electrical Services', professions: [
        { slug: 'residential-electrician', name: 'Residential Electrician', aliases: ['Electrician'], requiresLicense: true, services: ['Panel upgrades', 'Lighting', 'Generator installation'] },
        { slug: 'commercial-electrician', name: 'Commercial Electrician', requiresLicense: true, services: ['Church facilities', 'Office build-outs', 'Inspections'] },
      ]},
      { slug: 'plumbing', name: 'Plumbing', professions: [
        { slug: 'plumber', name: 'Plumber', requiresLicense: true, services: ['Repairs', 'Water heaters', 'Remodels'] },
      ]},
      { slug: 'general-contracting', name: 'General Contracting', professions: [
        { slug: 'general-contractor', name: 'General Contractor', aliases: ['Contractor'], requiresLicense: true, services: ['Home building', 'Church construction', 'Renovations'] },
        { slug: 'roofer', name: 'Roofer', services: ['Roof replacement', 'Storm repair'] },
      ]},
    ],
  },
  {
    slug: 'food-beverage', name: 'Food & Beverage',
    description: 'Bakeries, cafés, caterers, and restaurants.',
    categories: [
      { slug: 'bakeries', name: 'Bakeries', professions: [
        { slug: 'baker', name: 'Baker', services: ['Custom cakes', 'Wedding cakes', 'Bread', 'Pastries', 'Gluten-free baking'] },
        { slug: 'caterer', name: 'Caterer', services: ['Weddings', 'Church events', 'Corporate catering'] },
      ]},
      { slug: 'restaurants', name: 'Restaurants & Cafés', professions: [
        { slug: 'restaurant-owner', name: 'Restaurant Owner', services: ['Dine-in', 'Takeout', 'Private events'] },
        { slug: 'coffee-shop', name: 'Coffee Shop', services: ['Espresso bar', 'Study space', 'Ministry meetups'] },
      ]},
    ],
  },
  {
    slug: 'healthcare-wellness', name: 'Healthcare & Wellness',
    description: 'Medical, dental, mental-health, and wellness providers.',
    categories: [
      { slug: 'mental-health', name: 'Mental Health Care', professions: [
        { slug: 'christian-counselor', name: 'Christian Counselor', aliases: ['Counselor', 'Therapist'], requiresLicense: true, services: ['Individual counseling', 'Marriage counseling', 'Family counseling', 'Addiction counseling', 'Pastoral counseling'] },
        { slug: 'psychologist', name: 'Psychologist', requiresLicense: true, services: ['Testing', 'Therapy', 'Trauma care'] },
      ]},
      { slug: 'medical', name: 'Medical & Dental', professions: [
        { slug: 'physician', name: 'Physician', requiresLicense: true, services: ['Primary care', 'Pediatrics'] },
        { slug: 'dentist', name: 'Dentist', requiresLicense: true, services: ['General dentistry', 'Orthodontics'] },
        { slug: 'chiropractor', name: 'Chiropractor', requiresLicense: true, services: ['Adjustments', 'Rehab'] },
      ]},
      { slug: 'fitness', name: 'Fitness & Wellness', professions: [
        { slug: 'personal-trainer', name: 'Personal Trainer', services: ['Coaching', 'Nutrition'] },
      ]},
    ],
  },
  {
    slug: 'education', name: 'Education',
    description: 'Schools, tutoring, and training programs.',
    categories: [
      { slug: 'schools', name: 'Schools', professions: [
        { slug: 'private-school', name: 'Private Christian School', services: ['K-12 education', 'Preschool', 'Homeschool co-ops'] },
        { slug: 'tutor', name: 'Tutor', services: ['Math', 'Reading', 'Test prep'] },
      ]},
      { slug: 'music-education', name: 'Music Education', professions: [
        { slug: 'music-teacher', name: 'Music Teacher', services: ['Piano', 'Voice', 'Guitar', 'Worship training'] },
      ]},
    ],
  },
  {
    slug: 'arts-media-entertainment', name: 'Arts, Media & Entertainment',
    description: 'Photographers, filmmakers, musicians, and creatives.',
    categories: [
      { slug: 'photography', name: 'Photography', professions: [
        { slug: 'photographer', name: 'Photographer', services: ['Weddings', 'Portraits', 'Church events', 'Branding'] },
        { slug: 'videographer', name: 'Videographer', services: ['Wedding films', 'Ministry videos'] },
      ]},
      { slug: 'music', name: 'Music', professions: [
        { slug: 'worship-artist', name: 'Worship Artist', services: ['Leading worship', 'Concerts', 'Recording'] },
        { slug: 'music-producer', name: 'Music Producer', services: ['Recording', 'Mixing'] },
      ]},
      { slug: 'publishing', name: 'Publishing & Writing', professions: [
        { slug: 'author', name: 'Author', services: ['Books', 'Devotionals', 'Ghostwriting'] },
        { slug: 'publisher', name: 'Publisher', services: ['Book publishing', 'Editing'] },
      ]},
    ],
  },
  {
    slug: 'real-estate-property', name: 'Real Estate & Property',
    description: 'Agents, property managers, and home services.',
    categories: [
      { slug: 'brokerage', name: 'Brokerage', professions: [
        { slug: 'realtor', name: 'Realtor', aliases: ['Real Estate Agent'], requiresLicense: true, services: ['Buyer representation', 'Listings', 'Relocation'] },
        { slug: 'property-manager', name: 'Property Manager', services: ['Leasing', 'Maintenance'] },
      ]},
      { slug: 'home-services', name: 'Home Services', professions: [
        { slug: 'house-cleaner', name: 'House Cleaner', services: ['Recurring cleaning', 'Deep cleans'] },
        { slug: 'landscaper', name: 'Landscaper', services: ['Lawn care', 'Design'] },
        { slug: 'pest-control', name: 'Pest Control Technician', requiresLicense: true, services: ['Prevention', 'Treatment'] },
      ]},
    ],
  },
  {
    slug: 'legal-services', name: 'Legal Services',
    description: 'Attorneys and legal professionals.',
    categories: [
      { slug: 'law-practice', name: 'Law Practice', professions: [
        { slug: 'attorney', name: 'Attorney', aliases: ['Lawyer'], requiresLicense: true, services: ['Family law', 'Estate planning', 'Church law', 'Business law'] },
        { slug: 'mediator', name: 'Mediator', services: ['Conflict resolution', 'Family mediation'] },
      ]},
    ],
  },
  {
    slug: 'automotive', name: 'Automotive Services',
    description: 'Repair shops, dealers, and detailing.',
    categories: [
      { slug: 'auto-repair', name: 'Repair & Maintenance', professions: [
        { slug: 'auto-mechanic', name: 'Auto Mechanic', services: ['Diagnostics', 'Brakes', 'Oil service'] },
        { slug: 'auto-detailer', name: 'Auto Detailer', services: ['Detailing', 'Ceramic coating'] },
      ]},
    ],
  },
  {
    slug: 'beauty-personal-care', name: 'Beauty & Personal Care',
    description: 'Salons, barbers, and wellness studios.',
    categories: [
      { slug: 'salon', name: 'Salon & Barber', professions: [
        { slug: 'hairstylist', name: 'Hairstylist', requiresLicense: true, services: ['Cuts', 'Color', 'Bridal'] },
        { slug: 'barber', name: 'Barber', requiresLicense: true, services: ['Cuts', 'Shaves'] },
      ]},
    ],
  },
  {
    slug: 'travel-hospitality', name: 'Travel & Hospitality',
    description: 'Travel planners, venues, and event services.',
    categories: [
      { slug: 'travel', name: 'Travel', professions: [
        { slug: 'travel-agent', name: 'Travel Agent', services: ['Holy Land tours', 'Mission-trip logistics', 'Group travel'] },
        { slug: 'event-planner', name: 'Event Planner', services: ['Weddings', 'Conferences', 'Retreats'] },
      ]},
    ],
  },
  {
    slug: 'nonprofit-civic', name: 'Nonprofit & Civic Organizations',
    description: 'Charities, foundations, and community groups.',
    categories: [
      { slug: 'charity', name: 'Charity & Relief', professions: [
        { slug: 'nonprofit-director', name: 'Nonprofit Director', services: ['Program management', 'Fundraising'] },
        { slug: 'volunteer-coordinator', name: 'Volunteer Coordinator', services: ['Outreach', 'Food drives'] },
      ]},
    ],
  },
  {
    slug: 'religious-organizations', name: 'Religious Organizations',
    description: 'Churches, ministries, and mission agencies.',
    categories: [
      { slug: 'ministry', name: 'Ministry', professions: [
        { slug: 'pastor', name: 'Pastor', services: ['Preaching', 'Pastoral care', 'Weddings & funerals'] },
        { slug: 'worship-leader', name: 'Worship Leader', services: ['Worship planning', 'Team training'] },
        { slug: 'missionary', name: 'Missionary', services: ['Field ministry', 'Support raising'] },
      ]},
    ],
  },
  {
    slug: 'retail-consumer', name: 'Retail & Consumer Services',
    description: 'Shops, boutiques, and consumer services.',
    categories: [
      { slug: 'retail', name: 'Retail', professions: [
        { slug: 'boutique-owner', name: 'Boutique Owner', services: ['Apparel', 'Gifts', 'Christian books'] },
        { slug: 'florist', name: 'Florist', services: ['Weddings', 'Funerals', 'Weekly arrangements'] },
      ]},
    ],
  },
  {
    slug: 'sports-recreation', name: 'Sports & Recreation',
    description: 'Coaches, leagues, and outdoor services.',
    categories: [
      { slug: 'coaching', name: 'Coaching', professions: [
        { slug: 'sports-coach', name: 'Sports Coach', services: ['Youth leagues', 'Private training'] },
      ]},
    ],
  },
  {
    slug: 'security-services', name: 'Security Services',
    description: 'Church safety teams and security providers.',
    categories: [
      { slug: 'safety', name: 'Safety', professions: [
        { slug: 'security-consultant', name: 'Security Consultant', services: ['Church safety plans', 'Training', 'Assessments'] },
      ]},
    ],
  },
];

export const industryBySlug = (slug: string) => INDUSTRIES.find((i) => i.slug === slug);
export const allProfessions = (): (Profession & { industrySlug: string; categorySlug: string })[] =>
  INDUSTRIES.flatMap((i) =>
    i.categories.flatMap((c) =>
      c.professions.map((p) => ({ ...p, industrySlug: i.slug, categorySlug: c.slug })),
    ),
  );
export const professionBySlug = (slug: string) => allProfessions().find((p) => p.slug === slug);
