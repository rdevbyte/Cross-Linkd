/**
 * Industry → Category → Subcategory → Profession taxonomy.
 * Normalized: unique slugs, industries separated from professions,
 * multi-level relationships, expandable accordion hierarchy.
 */
export interface Profession {
  slug: string;
  name: string;
  aliases?: string[];
  requiresLicense?: boolean;
  services?: string[];
}

export interface Category {
  slug: string;
  name: string;
  professions: Profession[];
}

export interface Industry {
  slug: string;
  name: string;
  description: string;
  categories: Category[];
}

export const INDUSTRIES: Industry[] = [
  {
    slug: 'food-beverage',
    name: 'Food & Beverage',
    description: 'Bakeries, restaurants, cafés, food trucks, and culinary providers.',
    categories: [
      {
        slug: 'bakeries',
        name: 'Bakeries',
        professions: [
          { slug: 'baker', name: 'Baker', services: ['Custom cakes', 'Bread', 'Pastries'] },
          { slug: 'caterer', name: 'Caterer', services: ['Events', 'Weddings', 'Church events'] },
        ],
      },
      { slug: 'restaurants', name: 'Restaurant', professions: [{ slug: 'restaurant-owner', name: 'Restaurant Owner', services: ['Dine-in', 'Takeout', 'Private events'] }] },
      { slug: 'coffee-shops', name: 'Café or Coffee Shop', professions: [{ slug: 'coffee-shop', name: 'Coffee Shop', services: ['Espresso bar', 'Study space', 'Ministry meetups'] }] },
      { slug: 'food-trucks', name: 'Food Truck', professions: [{ slug: 'food-truck-operator', name: 'Food Truck Operator', services: ['Mobile catering', 'Festivals'] }] },
      { slug: 'catering', name: 'Catering', professions: [{ slug: 'caterer', name: 'Caterer', services: ['Weddings', 'Church events', 'Corporate catering'] }] },
      { slug: 'specialty-grocery', name: 'Grocery or Specialty Food Store', professions: [{ slug: 'grocer', name: 'Specialty Grocer', services: ['Local produce', 'Specialty foods'] }] },
      { slug: 'food-manufacturing', name: 'Food Manufacturer', professions: [{ slug: 'food-producer', name: 'Food Producer', services: ['Packaged foods', 'Wholesale supply'] }] },
      { slug: 'other-food-beverage', name: 'Other Food & Beverage', professions: [{ slug: 'food-specialist', name: 'Food & Beverage Specialist', services: ['Specialty culinary services'] }] },
    ],
  },
  {
    slug: 'professional-business-services',
    name: 'Professional Services',
    description: 'Consulting, legal support, marketing, HR, and business advisory services.',
    categories: [
      { slug: 'consulting', name: 'Consulting & Business Advisory', professions: [{ slug: 'business-consultant', name: 'Business Consultant', services: ['Strategy', 'Operations'] }] },
      { slug: 'marketing', name: 'Marketing, Creative & Branding', professions: [{ slug: 'marketing-agency', name: 'Marketing Agency', services: ['Branding', 'Communications'] }] },
      { slug: 'legal-services', name: 'Legal Services & Law Practice', professions: [{ slug: 'attorney', name: 'Attorney', aliases: ['Lawyer'], requiresLicense: true, services: ['Estate planning', 'Business law'] }] },
      { slug: 'staffing-recruiting', name: 'Human Resources & Staffing', professions: [{ slug: 'hr-consultant', name: 'HR Consultant', services: ['Staffing', 'Talent acquisition'] }] },
      { slug: 'management-strategy', name: 'Management & Executive Coaching', professions: [{ slug: 'business-coach', name: 'Executive Coach', services: ['Leadership development'] }] },
      { slug: 'other-professional-services', name: 'Other Professional Services', professions: [{ slug: 'professional-consultant', name: 'Professional Consultant', services: ['Advisory services'] }] },
    ],
  },
  {
    slug: 'construction-skilled-trades',
    name: 'Home Services & Trades',
    description: 'General contractors, remodelers, electricians, plumbers, and home specialists.',
    categories: [
      { slug: 'general-contracting', name: 'General Contracting & Remodeling', professions: [{ slug: 'general-contractor', name: 'General Contractor', requiresLicense: true, services: ['Renovations', 'Home building'] }] },
      { slug: 'plumbing', name: 'Plumbing', professions: [{ slug: 'plumber', name: 'Plumber', requiresLicense: true, services: ['Repairs', 'Water heaters', 'Piping'] }] },
      { slug: 'electrical', name: 'Electrical Services', professions: [{ slug: 'residential-electrician', name: 'Residential Electrician', requiresLicense: true, services: ['Wiring', 'Lighting', 'Generators'] }] },
      { slug: 'hvac', name: 'HVAC & Heating/Cooling', professions: [{ slug: 'hvac-technician', name: 'HVAC Specialist', requiresLicense: true, services: ['AC repair', 'Heating', 'Air quality'] }] },
      { slug: 'roofing', name: 'Roofing & Siding', professions: [{ slug: 'roofer', name: 'Roofer', services: ['Roof replacement', 'Storm damage repair'] }] },
      { slug: 'landscaping', name: 'Landscaping & Lawn Care', professions: [{ slug: 'landscaper', name: 'Landscaper', services: ['Lawn maintenance', 'Design', 'Hardscaping'] }] },
      { slug: 'painting', name: 'Painting & Drywall', professions: [{ slug: 'painter', name: 'Professional Painter', services: ['Interior painting', 'Exterior painting'] }] },
      { slug: 'cleaning-services', name: 'Cleaning & Janitorial', professions: [{ slug: 'house-cleaner', name: 'Cleaning Specialist', services: ['Deep cleaning', 'Commercial janitorial'] }] },
      { slug: 'other-home-services', name: 'Other Home Services & Trades', professions: [{ slug: 'handyman', name: 'Handyman Specialist', services: ['Home maintenance', 'General repairs'] }] },
    ],
  },
  {
    slug: 'healthcare-wellness',
    name: 'Health & Wellness',
    description: 'Counseling, medical practices, chiropractic care, and wellness services.',
    categories: [
      { slug: 'mental-health', name: 'Christian Counseling & Mental Health', professions: [{ slug: 'christian-counselor', name: 'Christian Counselor', requiresLicense: true, services: ['Individual counseling', 'Marriage therapy', 'Family counseling'] }] },
      { slug: 'medical', name: 'Medical & Dental Practice', professions: [{ slug: 'physician', name: 'Physician', requiresLicense: true, services: ['Primary care', 'Pediatrics'] }, { slug: 'dentist', name: 'Dentist', requiresLicense: true, services: ['Family dentistry'] }] },
      { slug: 'chiropractic', name: 'Chiropractic & Physical Therapy', professions: [{ slug: 'chiropractor', name: 'Chiropractor', requiresLicense: true, services: ['Adjustments', 'Rehabilitation'] }] },
      { slug: 'fitness', name: 'Fitness, Gyms & Personal Training', professions: [{ slug: 'personal-trainer', name: 'Personal Trainer', services: ['Coaching', 'Strength training'] }] },
      { slug: 'nutrition', name: 'Nutrition & Holistic Wellness', professions: [{ slug: 'nutritionist', name: 'Nutritionist', services: ['Meal planning', 'Wellness coaching'] }] },
      { slug: 'other-health-wellness', name: 'Other Health & Wellness', professions: [{ slug: 'wellness-specialist', name: 'Wellness Practitioner', services: ['Holistic care'] }] },
    ],
  },
  {
    slug: 'retail-consumer',
    name: 'Retail & Consumer Goods',
    description: 'Christian bookstores, boutiques, home furnishings, and specialty retail.',
    categories: [
      { slug: 'christian-books', name: 'Christian Bookstore & Bibles', professions: [{ slug: 'bookseller', name: 'Christian Bookseller', services: ['Bibles', 'Curriculum', 'Gifts'] }] },
      { slug: 'boutique-apparel', name: 'Clothing & Apparel', professions: [{ slug: 'boutique-owner', name: 'Boutique Owner', services: ['Modest apparel', 'Apparel'] }] },
      { slug: 'home-goods', name: 'Home Goods & Furniture', professions: [{ slug: 'home-merchant', name: 'Furnishings Retailer', services: ['Decor', 'Handcrafted goods'] }] },
      { slug: 'florist', name: 'Florist & Gift Shop', professions: [{ slug: 'florist', name: 'Florist', services: ['Floral arrangements', 'Gift baskets'] }] },
      { slug: 'specialty-retail', name: 'Specialty Retail & Crafts', professions: [{ slug: 'artisan', name: 'Artisan Merchant', services: ['Handmade goods', 'Jewelry'] }] },
      { slug: 'other-retail', name: 'Other Retail Store', professions: [{ slug: 'retail-merchant', name: 'Retailer', services: ['Consumer products'] }] },
    ],
  },
  {
    slug: 'financial-services',
    name: 'Finance & Insurance',
    description: 'Financial advisory, CPA tax services, insurance, and lending.',
    categories: [
      { slug: 'accounting-tax', name: 'Accounting, Bookkeeping & Tax', professions: [{ slug: 'cpa', name: 'Certified Public Accountant', requiresLicense: true, services: ['Tax returns', 'Bookkeeping', 'Audits'] }] },
      { slug: 'financial-planning', name: 'Financial Planning & Wealth Management', professions: [{ slug: 'financial-advisor', name: 'Financial Advisor', requiresLicense: true, services: ['Biblical stewardship', 'Retirement', 'Investments'] }] },
      { slug: 'insurance', name: 'Insurance & Health Sharing', professions: [{ slug: 'insurance-agent', name: 'Insurance Agent', requiresLicense: true, services: ['Life insurance', 'Health plans', 'Property insurance'] }] },
      { slug: 'mortgage-lending', name: 'Mortgage & Commercial Lending', professions: [{ slug: 'mortgage-broker', name: 'Mortgage Broker', requiresLicense: true, services: ['Home loans', 'Refinancing', 'Church financing'] }] },
      { slug: 'other-finance', name: 'Other Finance & Insurance', professions: [{ slug: 'finance-specialist', name: 'Financial Specialist', services: ['Financial advisory'] }] },
    ],
  },
  {
    slug: 'real-estate-property',
    name: 'Real Estate & Property',
    description: 'Residential and commercial real estate agents, property managers, and inspectors.',
    categories: [
      { slug: 'brokerage', name: 'Residential Real Estate Brokerage', professions: [{ slug: 'realtor', name: 'Realtor', requiresLicense: true, services: ['Home buying', 'Home selling', 'Relocation'] }] },
      { slug: 'commercial-real-estate', name: 'Commercial Real Estate', professions: [{ slug: 'commercial-broker', name: 'Commercial Broker', requiresLicense: true, services: ['Leasing', 'Church properties', 'Land sales'] }] },
      { slug: 'property-management', name: 'Property Management', professions: [{ slug: 'property-manager', name: 'Property Manager', services: ['Rental management', 'Tenant placement'] }] },
      { slug: 'inspection-appraisal', name: 'Home Inspection & Appraisal', professions: [{ slug: 'home-inspector', name: 'Home Inspector', requiresLicense: true, services: ['Pre-purchase inspection', 'Appraisals'] }] },
      { slug: 'other-real-estate', name: 'Other Real Estate Services', professions: [{ slug: 'real-estate-specialist', name: 'Real Estate Specialist', services: ['Property services'] }] },
    ],
  },
  {
    slug: 'education',
    name: 'Education & Childcare',
    description: 'Christian private schools, tutoring, homeschool academies, and music lessons.',
    categories: [
      { slug: 'schools', name: 'Christian Schools & Academies', professions: [{ slug: 'private-school', name: 'Christian School Educator', services: ['K-12 education', 'Biblical curriculum'] }] },
      { slug: 'music-education', name: 'Music & Arts Instruction', professions: [{ slug: 'music-teacher', name: 'Music Teacher', services: ['Piano', 'Voice', 'Guitar', 'Worship training'] }] },
      { slug: 'tutoring', name: 'Tutoring & Academic Coaching', professions: [{ slug: 'tutor', name: 'Academic Tutor', services: ['Math', 'Science', 'College prep'] }] },
      { slug: 'childcare', name: 'Childcare & Preschool', professions: [{ slug: 'childcare-provider', name: 'Childcare Director', services: ['Early childhood', 'Preschool'] }] },
      { slug: 'homeschool', name: 'Homeschool Programs & Co-ops', professions: [{ slug: 'homeschool-director', name: 'Co-op Leader', services: ['Homeschool enrichment', 'Classes'] }] },
      { slug: 'seminaries', name: 'Higher Education & Seminaries', professions: [{ slug: 'theological-educator', name: 'Theological Educator', services: ['Bible college', 'Seminary degrees'] }] },
      { slug: 'other-education', name: 'Other Education Service', professions: [{ slug: 'educator', name: 'Educator', services: ['Instructional services'] }] },
    ],
  },
  {
    slug: 'arts-media-entertainment',
    name: 'Media & Creative Services',
    description: 'Photography, videography, Christian music production, graphic design, and publishing.',
    categories: [
      { slug: 'photography', name: 'Photography', professions: [{ slug: 'photographer', name: 'Photographer', services: ['Weddings', 'Portraits', 'Events'] }] },
      { slug: 'videography', name: 'Videography & Film Production', professions: [{ slug: 'videographer', name: 'Videographer', services: ['Event video', 'Ministry documentaries'] }] },
      { slug: 'music', name: 'Worship Arts & Music Production', professions: [{ slug: 'music-producer', name: 'Music Producer', services: ['Recording', 'Mixing', 'Songwriting'] }] },
      { slug: 'publishing', name: 'Publishing, Writing & Editing', professions: [{ slug: 'publisher', name: 'Publisher', services: ['Book publishing', 'Editing', 'Distribution'] }] },
      { slug: 'graphic-design', name: 'Graphic Design & Illustration', professions: [{ slug: 'graphic-designer', name: 'Graphic Designer', services: ['Logo design', 'Print design', 'Branding'] }] },
      { slug: 'other-media-creative', name: 'Other Media & Creative Services', professions: [{ slug: 'creative-specialist', name: 'Creative Artist', services: ['Creative media'] }] },
    ],
  },
  {
    slug: 'information-technology',
    name: 'Technology',
    description: 'Web development, managed IT support, cybersecurity, and church media tech.',
    categories: [
      { slug: 'software', name: 'Custom Software & Web Development', professions: [{ slug: 'web-developer', name: 'Web Developer', services: ['Websites', 'Web applications', 'E-commerce'] }] },
      { slug: 'it-support', name: 'IT Support & Managed Services', professions: [{ slug: 'it-support', name: 'IT Support Specialist', services: ['Managed IT', 'Network setup', 'Data backup'] }] },
      { slug: 'church-media', name: 'Church AV & Media Production', professions: [{ slug: 'media-producer', name: 'AV Engineer', services: ['Sound engineering', 'Livestream setup'] }] },
      { slug: 'cybersecurity', name: 'Cybersecurity & Cloud Solutions', professions: [{ slug: 'security-specialist', name: 'Cybersecurity Analyst', services: ['Network protection', 'Cloud migration'] }] },
      { slug: 'other-technology', name: 'Other Technology Services', professions: [{ slug: 'tech-consultant', name: 'Technology Consultant', services: ['Tech consulting'] }] },
    ],
  },
  {
    slug: 'nonprofit-civic',
    name: 'Nonprofit & Community Organizations',
    description: 'Charities, human services, family ministries, and community outreaches.',
    categories: [
      { slug: 'charity', name: 'Charity & Relief Services', professions: [{ slug: 'nonprofit-director', name: 'Charity Director', services: ['Food pantry', 'Disaster relief', 'Shelter'] }] },
      { slug: 'youth-family', name: 'Youth & Family Programs', professions: [{ slug: 'family-director', name: 'Family Minister', services: ['Mentorship', 'Parenting support'] }] },
      { slug: 'community-outreach', name: 'Community Outreach & Advocacy', professions: [{ slug: 'outreach-coordinator', name: 'Outreach Leader', services: ['Neighborhood outreach', 'Community development'] }] },
      { slug: 'missions', name: 'Mission Agencies & Global Relief', professions: [{ slug: 'mission-director', name: 'Mission Director', services: ['International missions', 'Relief work'] }] },
      { slug: 'other-nonprofit', name: 'Other Community Organization', professions: [{ slug: 'community-leader', name: 'Community Leader', services: ['Nonprofit services'] }] },
    ],
  },
  {
    slug: 'religious-organizations',
    name: 'Religious Organizations',
    description: 'Churches, ministries, retreat centers, and Christian broadcasting.',
    categories: [
      { slug: 'churches', name: 'Churches & Congregations', professions: [{ slug: 'pastor', name: 'Senior Pastor', services: ['Worship services', 'Discipleship', 'Community care'] }] },
      { slug: 'ministry', name: 'Para-Church & Campus Ministries', professions: [{ slug: 'ministry-leader', name: 'Ministry Director', services: ['Campus ministry', 'Evangelism'] }] },
      { slug: 'retreat-centers', name: 'Retreat Centers & Camps', professions: [{ slug: 'camp-director', name: 'Camp Director', services: ['Youth camps', 'Conferences', 'Retreats'] }] },
      { slug: 'broadcasting', name: 'Christian Media & Broadcasting', professions: [{ slug: 'broadcaster', name: 'Christian Broadcaster', services: ['Radio programming', 'Podcasting'] }] },
      { slug: 'other-religious', name: 'Other Religious Organization', professions: [{ slug: 'religious-leader', name: 'Faith Leader', services: ['Spiritual leadership'] }] },
    ],
  },
  {
    slug: 'travel-hospitality',
    name: 'Hospitality & Travel',
    description: 'Faith-based tour planners, event venues, retreat facilities, and lodging.',
    categories: [
      { slug: 'travel', name: 'Faith-Based Travel & Pilgrimages', professions: [{ slug: 'travel-agent', name: 'Travel Planner', services: ['Holy Land tours', 'Mission travel', 'Group trips'] }] },
      { slug: 'venues', name: 'Event Venues & Banquet Halls', professions: [{ slug: 'venue-coordinator', name: 'Venue Manager', services: ['Wedding receptions', 'Conferences', 'Banquets'] }] },
      { slug: 'lodging', name: 'Lodging & Bed & Breakfasts', professions: [{ slug: 'innkeeper', name: 'Innkeeper', services: ['Hospitality', 'Guest accommodations'] }] },
      { slug: 'event-services', name: 'Event Planning & Coordination', professions: [{ slug: 'event-planner', name: 'Event Planner', services: ['Event coordination', 'Decor'] }] },
      { slug: 'other-hospitality', name: 'Other Hospitality & Travel', professions: [{ slug: 'hospitality-host', name: 'Hospitality Host', services: ['Guest services'] }] },
    ],
  },
  {
    slug: 'automotive',
    name: 'Automotive',
    description: 'Auto repair, collision repair, maintenance, and vehicle services.',
    categories: [
      { slug: 'auto-repair', name: 'Auto Repair & Mechanic', professions: [{ slug: 'auto-mechanic', name: 'Master Mechanic', services: ['Engine repair', 'Brakes', 'Diagnostics'] }] },
      { slug: 'auto-body', name: 'Auto Body & Collision', professions: [{ slug: 'collision-tech', name: 'Collision Specialist', services: ['Dent repair', 'Paint restoration'] }] },
      { slug: 'auto-detailing', name: 'Auto Detailing & Care', professions: [{ slug: 'auto-detailer', name: 'Auto Detailer', services: ['Interior detail', 'Ceramic coating'] }] },
      { slug: 'vehicle-sales', name: 'Vehicle Sales & Dealerships', professions: [{ slug: 'dealer', name: 'Auto Dealer', services: ['Pre-owned vehicles', 'Financing'] }] },
      { slug: 'other-automotive', name: 'Other Automotive Service', professions: [{ slug: 'automotive-tech', name: 'Automotive Specialist', services: ['Specialty vehicle care'] }] },
    ],
  },
  {
    slug: 'beauty-personal-care',
    name: 'Beauty & Personal Care',
    description: 'Hair salons, barbershops, esthetics, and spa therapy.',
    categories: [
      { slug: 'salon', name: 'Hair Salon & Barbershop', professions: [{ slug: 'hairstylist', name: 'Hairstylist', requiresLicense: true, services: ['Hair styling', 'Color', 'Barbering'] }] },
      { slug: 'skincare', name: 'Skincare & Esthetics', professions: [{ slug: 'esthetician', name: 'Licensed Esthetician', requiresLicense: true, services: ['Facials', 'Skin treatments'] }] },
      { slug: 'spa-massage', name: 'Spa & Massage Therapy', professions: [{ slug: 'massage-therapist', name: 'Massage Therapist', requiresLicense: true, services: ['Therapeutic massage'] }] },
      { slug: 'other-beauty', name: 'Other Beauty & Personal Care', professions: [{ slug: 'beauty-specialist', name: 'Beauty Specialist', services: ['Personal care'] }] },
    ],
  },
  {
    slug: 'sports-recreation',
    name: 'Sports & Recreation',
    description: 'Youth sports leagues, personal fitness, and outdoor adventure ministries.',
    categories: [
      { slug: 'coaching', name: 'Youth Sports & Athletic Coaching', professions: [{ slug: 'sports-coach', name: 'Athletic Coach', services: ['Youth leagues', 'Training'] }] },
      { slug: 'outdoor-recreation', name: 'Outdoor & Adventure Ministries', professions: [{ slug: 'outdoor-guide', name: 'Recreation Guide', services: ['Wilderness trips', 'Camp activities'] }] },
      { slug: 'other-sports', name: 'Other Sports & Recreation', professions: [{ slug: 'recreation-leader', name: 'Recreation Leader', services: ['Sports services'] }] },
    ],
  },
  {
    slug: 'security-services',
    name: 'Security Services',
    description: 'Church safety team training, surveillance systems, and security consulting.',
    categories: [
      { slug: 'safety', name: 'Church Safety & Security Teams', professions: [{ slug: 'security-consultant', name: 'Security Consultant', services: ['Emergency plans', 'Safety training'] }] },
      { slug: 'security-systems', name: 'Security & Surveillance Systems', professions: [{ slug: 'systems-installer', name: 'Security Tech', services: ['Camera installation', 'Access control'] }] },
      { slug: 'other-security', name: 'Other Security Services', professions: [{ slug: 'safety-specialist', name: 'Safety Specialist', services: ['Protective services'] }] },
    ],
  },
  {
    slug: 'other-industries',
    name: 'Other',
    description: 'Specialized industries and unique commercial services.',
    categories: [
      { slug: 'other-business', name: 'Other Business or Service', professions: [{ slug: 'general-specialist', name: 'Specialist', services: ['General services'] }] },
    ],
  },
];

export const industryBySlug = (slug: string) => INDUSTRIES.find((i) => i.slug === slug);
export const categoryBySlug = (catSlug: string) => {
  for (const ind of INDUSTRIES) {
    const found = ind.categories.find((c) => c.slug === catSlug);
    if (found) return { category: found, industry: ind };
  }
  return undefined;
};
export const allProfessions = (): (Profession & { industrySlug: string; categorySlug: string })[] =>
  INDUSTRIES.flatMap((i) =>
    i.categories.flatMap((c) =>
      c.professions.map((p) => ({ ...p, industrySlug: i.slug, categorySlug: c.slug })),
    ),
  );
export const professionBySlug = (slug: string) => allProfessions().find((p) => p.slug === slug);
