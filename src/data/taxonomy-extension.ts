import type { Category, Industry, Profession } from './industries.base';

const p = (
  slug: string,
  name: string,
  services: string[],
  aliases: string[] = [],
  requiresLicense = false,
  keywords: string[] = [],
): Profession => ({ slug, name, services, aliases, requiresLicense, keywords });

const c = (
  slug: string,
  name: string,
  professions: Profession[],
  aliases: string[] = [],
  keywords: string[] = [],
): Category => ({ slug, name, professions, aliases, keywords });

const i = (
  slug: string,
  name: string,
  description: string,
  categories: Category[],
  aliases: string[] = [],
  keywords: string[] = [],
): Industry => ({ slug, name, description, categories, aliases, keywords });

/** New top-level sectors; existing industry/category/profession slugs are retained where possible. */
export const TAXONOMY_INDUSTRY_ADDITIONS: Industry[] = [
  i('marketing-advertising-pr', 'Marketing, Advertising & Public Relations', 'Marketing strategy, advertising, public relations, digital campaigns, and communications.', [
    c('advertising', 'Advertising & Media Buying', [p('advertising-agency', 'Advertising Agency', ['Campaign strategy', 'Media planning', 'Paid search and social ads', 'Creative production'], ['ad agency', 'media buyer', 'advertiser'], false, ['PPC', 'SEM', 'media buying'])], ['advertising agency', 'ad agency'], ['campaigns', 'paid media', 'media buying']),
    c('public-relations', 'Public Relations & Communications', [p('public-relations-consultant', 'Public Relations Consultant', ['Media relations', 'Press releases', 'Crisis communications', 'Executive communications'], ['PR consultant', 'publicist', 'communications consultant'], false, ['PR', 'media relations'])], ['PR', 'publicist'], ['press', 'communications', 'reputation']),
    c('digital-marketing', 'Digital Marketing & Search', [p('digital-marketer', 'Digital Marketing Specialist', ['Search engine optimization', 'Search advertising', 'Social media campaigns', 'Email marketing'], ['SEO specialist', 'digital marketing agency', 'growth marketer'], false, ['SEO', 'SEM', 'PPC', 'email campaigns'])], ['online marketing', 'internet marketing'], ['SEO', 'SEM', 'PPC', 'social media']),
    c('market-research', 'Market Research & Analytics', [p('market-researcher', 'Market Researcher', ['Customer research', 'Competitive analysis', 'Surveys', 'Market sizing'], ['consumer researcher', 'marketing analyst'], false, ['audience research', 'insights'])], ['consumer research', 'marketing research'], ['analytics', 'consumer insights']),
    c('other-marketing', 'Other Marketing, Advertising & PR', [p('marketing-specialist', 'Marketing, Advertising & PR Specialist', ['Brand communications', 'Campaign planning', 'Marketing consultation'], ['marketing professional', 'communications professional'])], ['other marketing services'], ['branding', 'campaigns', 'communications']),
  ], ['marketing', 'advertising', 'PR', 'public relations', 'communications', 'marcom'], ['brand strategy', 'campaigns', 'SEO', 'publicity']),

  i('legal-service-industry', 'Legal Services', 'Law firms, attorneys, legal support, mediation, and related services.', [
    c('legal-services', 'Legal Services & Law Practice', [p('attorney', 'Attorney', ['Business law', 'Estate planning', 'Family law', 'Civil litigation', 'Nonprofit formation'], ['lawyer', 'counsel', 'solicitor'], true, ['legal counsel', 'law practice'])], ['law firm', 'law practice'], ['attorney', 'lawyer', 'legal advice']),
    c('dispute-resolution', 'Mediation & Dispute Resolution', [p('mediator', 'Mediator', ['Civil mediation', 'Family mediation', 'Workplace conflict resolution', 'Restorative conferencing'], ['arbitrator', 'conflict resolution specialist'], false, ['mediation', 'arbitration'])], ['mediation', 'arbitration'], ['conflict resolution', 'settlement']),
    c('legal-support', 'Legal Support & Document Services', [p('paralegal', 'Paralegal', ['Legal research', 'Document preparation', 'Case organization', 'Filing support'], ['legal assistant', 'law clerk'], false, ['legal documents', 'case support'])], ['legal assistant', 'paralegal services'], ['document preparation', 'legal research']),
    c('other-legal-services', 'Other Legal Services', [p('legal-services-provider', 'Legal Services Provider', ['Legal consulting', 'Document review', 'Compliance support'], ['legal consultant'])], ['other legal'], ['compliance', 'legal support']),
  ], ['law', 'lawyers', 'attorneys', 'legal'], ['attorney', 'law firm', 'counsel', 'mediation']),

  i('home-property-services', 'Home & Property Services', 'Residential property care, outdoor maintenance, pest control, and home upkeep.', [
    c('landscaping', 'Landscaping & Lawn Care', [p('landscaper', 'Landscaper', ['Lawn maintenance', 'Landscape design', 'Hardscaping', 'Irrigation', 'Seasonal cleanup'], ['lawn care company', 'landscape designer', 'gardener'], false, ['yard care', 'lawn service'])], ['lawn care', 'gardening'], ['yard maintenance', 'hardscape', 'irrigation']),
    c('other-home-services', 'Other Home & Property Services', [p('handyman', 'Handyman Specialist', ['Home maintenance', 'General repairs', 'Fixture installation', 'Minor remodeling'], ['handyperson', 'home repair specialist'], false, ['home repair', 'property maintenance'])], ['handyman services', 'home repair'], ['maintenance', 'repairs']),
    c('pest-control', 'Pest Control & Wildlife Removal', [p('pest-control-specialist', 'Pest Control Specialist', ['Pest inspections', 'Termite treatment', 'Rodent control', 'Mosquito service', 'Wildlife exclusion'], ['exterminator', 'pest management professional'], false, ['extermination', 'termite control'])], ['exterminator', 'pest management'], ['termite', 'wildlife removal', 'mosquito control']),
    c('property-maintenance', 'Property Maintenance & Inspection', [p('property-maintenance-provider', 'Property Maintenance Provider', ['Seasonal maintenance', 'Rental turnover', 'Gutter cleaning', 'Preventive inspections'], ['maintenance technician', 'property maintenance company'], false, ['rental maintenance', 'home upkeep'])], ['home maintenance', 'rental property maintenance'], ['preventive maintenance', 'property care']),
    c('pool-spa-services', 'Pool & Spa Services', [p('pool-service-technician', 'Pool Service Technician', ['Pool cleaning', 'Water testing', 'Equipment repair', 'Seasonal opening and closing'], ['pool cleaner', 'pool contractor'], false, ['pool maintenance', 'spa maintenance'])], ['pool maintenance', 'pool cleaning'], ['water testing', 'pool repair']),
    c('other-home-property', 'Other Home & Property Services', [p('home-property-specialist', 'Home & Property Services Provider', ['Residential property care', 'Home service consultation'], ['home services professional'])], ['other home services'], ['residential', 'property care']),
  ], ['home services', 'property services', 'home improvement'], ['lawn care', 'pest control', 'home repair', 'property maintenance']),

  i('transportation-logistics', 'Transportation & Logistics', 'Passenger transportation, delivery, moving, freight, and logistics providers.', [
    c('passenger-transportation', 'Passenger Transportation', [p('transportation-provider', 'Passenger Transportation Provider', ['Airport transfers', 'Shuttle service', 'Private car service', 'Accessible transportation'], ['chauffeur', 'shuttle operator', 'car service'], false, ['transport', 'rides'])], ['car service', 'shuttle'], ['airport transfer', 'passenger transport']),
    c('moving-storage', 'Moving & Storage', [p('mover', 'Moving & Storage Provider', ['Local moves', 'Long-distance moves', 'Packing', 'Storage'], ['moving company', 'movers', 'storage provider'], false, ['relocation', 'house moving'])], ['moving company', 'movers'], ['packing', 'relocation', 'storage']),
    c('courier-delivery', 'Courier & Delivery Services', [p('courier', 'Courier & Delivery Provider', ['Same-day delivery', 'Scheduled routes', 'Parcel pickup', 'Local courier service'], ['delivery driver', 'messenger service'], false, ['last mile', 'parcel delivery'])], ['courier', 'delivery service'], ['same day', 'last mile']),
    c('freight-logistics', 'Freight & Supply-Chain Logistics', [p('logistics-provider', 'Logistics Provider', ['Freight brokerage', 'Route planning', 'Warehousing coordination', 'Supply-chain consulting'], ['freight broker', 'logistics company', 'supply chain consultant'], false, ['freight', 'supply chain'])], ['freight', 'supply chain'], ['warehousing', 'freight brokerage']),
    c('other-transportation', 'Other Transportation & Logistics', [p('transportation-specialist', 'Transportation & Logistics Specialist', ['Transportation planning', 'Fleet coordination'], ['transportation consultant'])], ['other transport'], ['fleet', 'logistics']),
  ], ['transport', 'moving', 'freight', 'delivery', 'supply chain'], ['shuttle', 'courier', 'freight', 'moving']),

  i('agriculture-farming', 'Agriculture & Farming', 'Crop and livestock production, farm services, and agricultural suppliers.', [
    c('crop-farming', 'Crop Farming & Produce', [p('crop-farmer', 'Crop Farmer', ['Field crop production', 'Vegetable farming', 'Orchard management', 'Farm-gate sales'], ['farmer', 'grower', 'produce farmer'], false, ['agriculture', 'crops'])], ['crop production', 'produce farm'], ['orchard', 'vegetables', 'field crops']),
    c('livestock-ranching', 'Livestock & Ranching', [p('rancher', 'Rancher & Livestock Producer', ['Cattle ranching', 'Livestock raising', 'Pasture management', 'Breeding services'], ['livestock farmer', 'cattle rancher', 'ranch owner'], false, ['livestock', 'ranch'])], ['ranching', 'livestock'], ['cattle', 'pasture', 'animal husbandry']),
    c('farm-services', 'Farm & Agricultural Services', [p('agricultural-consultant', 'Agricultural Consultant', ['Agronomy consulting', 'Soil testing', 'Crop planning', 'Farm management'], ['agronomist', 'farm consultant', 'ag consultant'], false, ['agronomy', 'soil health'])], ['ag consulting', 'farm consulting'], ['soil', 'crop planning', 'farm management']),
    c('farm-supplies-equipment', 'Farm Supplies & Equipment', [p('farm-equipment-provider', 'Farm Equipment Provider', ['Equipment sales', 'Equipment repair', 'Irrigation supplies', 'Farm input delivery'], ['farm machinery dealer', 'agricultural supplier'], false, ['farm machinery', 'ag supplies'])], ['farm supply', 'agricultural equipment'], ['irrigation', 'machinery']),
    c('other-agriculture', 'Other Agriculture & Farming', [p('agricultural-specialist', 'Agriculture & Farming Specialist', ['Agricultural services', 'Farm consultation'], ['agriculture professional'])], ['other agriculture'], ['farm services', 'agriculture']),
  ], ['agriculture', 'ag', 'farming', 'farm'], ['crops', 'livestock', 'ranching', 'agronomy']),

  i('manufacturing', 'Manufacturing', 'Product manufacturing, fabrication, assembly, packaging, and industrial production.', [
    c('industrial-manufacturing', 'Industrial & Commercial Manufacturing', [p('manufacturer', 'Manufacturer', ['Contract manufacturing', 'Product assembly', 'Private-label production', 'Production planning'], ['manufacturer', 'contract manufacturer'], false, ['production', 'factory'])], ['manufacturers', 'factory'], ['contract manufacturing', 'assembly']),
    c('fabrication-machining', 'Fabrication & Machining', [p('fabrication-provider', 'Fabrication & Machining Provider', ['Metal fabrication', 'CNC machining', 'Welding', 'Custom parts'], ['fabricator', 'machine shop', 'welder'], false, ['CNC', 'metalwork'])], ['machine shop', 'metal fabrication'], ['welding', 'machining', 'CNC']),
    c('packaging-production', 'Packaging & Production Services', [p('packaging-provider', 'Packaging & Production Provider', ['Product packaging', 'Labeling', 'Kitting', 'Fulfillment preparation'], ['packaging company', 'co-packer'], false, ['co-packing', 'labeling'])], ['co-packing', 'product packaging'], ['kitting', 'labeling']),
    c('custom-products', 'Custom & Made-to-Order Products', [p('custom-product-maker', 'Custom Product Manufacturer', ['Custom product design', 'Small-batch production', 'Prototyping', 'Made-to-order goods'], ['product maker', 'custom manufacturer'], false, ['prototyping', 'small batch'])], ['custom manufacturing', 'small-batch production'], ['prototype', 'made to order']),
    c('other-manufacturing', 'Other Manufacturing', [p('manufacturing-specialist', 'Manufacturing Specialist', ['Manufacturing consultation', 'Production support'], ['manufacturing professional'])], ['other manufacturing'], ['industrial production', 'factory']),
  ], ['manufacturing', 'manufacturer', 'factory', 'production'], ['fabrication', 'assembly', 'packaging', 'machining']),

  i('government-civic-services', 'Government & Civic Services', 'Public agencies, civic administration, utilities, and government services.', [
    c('government-agencies', 'Government Agencies & Administration', [p('government-agency', 'Government Agency', ['Public administration', 'Permits and licensing', 'Community information', 'Public records'], ['public agency', 'municipal department'], false, ['municipality', 'public administration'])], ['public agency', 'municipal government'], ['city services', 'county services']),
    c('civic-services', 'Civic & Community Services', [p('civic-service-provider', 'Civic Services Provider', ['Civic engagement', 'Community planning', 'Public education', 'Civic information'], ['civic organization', 'community service provider'], false, ['civic', 'public service'])], ['civic organization', 'community programs'], ['community planning', 'public information']),
    c('public-safety', 'Public Safety & Emergency Services', [p('public-safety-provider', 'Public Safety Provider', ['Emergency preparedness', 'Fire protection', 'Emergency response', 'Safety education'], ['emergency services', 'public safety agency'], false, ['first responder', 'emergency response'])], ['emergency services', 'public safety'], ['fire', 'emergency preparedness']),
    c('public-utilities', 'Utilities & Public Infrastructure', [p('utility-provider', 'Public Utility Provider', ['Water service', 'Wastewater service', 'Energy distribution', 'Infrastructure maintenance'], ['utility company', 'public works provider'], false, ['public works', 'utilities'])], ['public utilities', 'public works'], ['water', 'energy', 'infrastructure']),
    c('other-government-civic', 'Other Government & Civic Services', [p('civic-services-specialist', 'Government & Civic Services Provider', ['Civic information', 'Public service support'], ['government service provider'])], ['other civic services'], ['public service', 'civic']),
  ], ['public sector', 'public services', 'civic'], ['government', 'municipal', 'county', 'public administration']),

  i('cleaning-maintenance', 'Cleaning & Maintenance', 'Residential, commercial, and facility cleaning and maintenance services.', [
    c('cleaning-services', 'Cleaning & Janitorial', [p('house-cleaner', 'Cleaning Specialist', ['Recurring home cleaning', 'Deep cleaning', 'Move-in and move-out cleaning', 'Commercial janitorial'], ['house cleaner', 'cleaning company', 'cleaner'], false, ['maid service', 'janitor'])], ['cleaners', 'janitorial'], ['housekeeping', 'deep clean', 'commercial cleaning']),
    c('carpet-upholstery-cleaning', 'Carpet & Upholstery Cleaning', [p('carpet-cleaner', 'Carpet & Upholstery Cleaner', ['Carpet steam cleaning', 'Upholstery cleaning', 'Stain treatment', 'Odor removal'], ['carpet cleaning company', 'upholstery cleaner'], false, ['steam cleaning', 'rug cleaning'])], ['rug cleaning', 'upholstery cleaning'], ['steam clean', 'stain removal']),
    c('window-pressure-cleaning', 'Window & Pressure Washing', [p('exterior-cleaner', 'Exterior Cleaning Provider', ['Window washing', 'Pressure washing', 'Gutter cleaning', 'Exterior surface cleaning'], ['window cleaner', 'pressure washer'], false, ['power washing', 'window washing'])], ['power washing', 'window cleaning'], ['gutter cleaning', 'exterior wash']),
    c('facilities-maintenance', 'Facilities & Building Maintenance', [p('facilities-maintenance-provider', 'Facilities Maintenance Provider', ['Preventive maintenance', 'Building repairs', 'Lighting maintenance', 'Facility inspections'], ['facility manager', 'building maintenance technician'], false, ['facilities management', 'building maintenance'])], ['building maintenance', 'facility maintenance'], ['preventive maintenance', 'facility services']),
    c('other-cleaning-maintenance', 'Other Cleaning & Maintenance', [p('cleaning-maintenance-specialist', 'Cleaning & Maintenance Specialist', ['Specialty cleaning', 'Maintenance consultation'], ['janitorial professional'])], ['other cleaning services'], ['maintenance', 'cleaning']),
  ], ['janitorial', 'cleaners', 'maintenance services'], ['housekeeping', 'commercial cleaning', 'facilities maintenance']),

  i('pet-animal-services', 'Pet & Animal Services', 'Veterinary care, grooming, training, boarding, and animal support services.', [
    c('veterinary-care', 'Veterinary & Animal Health', [p('veterinarian', 'Veterinarian', ['Wellness exams', 'Vaccinations', 'Diagnostics', 'Surgery', 'Urgent care'], ['vet', 'animal doctor', 'veterinary clinic'], true, ['animal hospital', 'veterinary medicine'])], ['vet clinic', 'animal hospital'], ['veterinary', 'animal health']),
    c('pet-grooming', 'Pet Grooming', [p('pet-groomer', 'Pet Groomer', ['Bathing', 'Haircuts', 'Nail trimming', 'Deshedding'], ['dog groomer', 'animal groomer'], false, ['pet salon'])], ['dog grooming', 'pet salon'], ['bathing', 'clipping']),
    c('pet-boarding-daycare', 'Pet Boarding & Daycare', [p('pet-care-provider', 'Pet Boarding & Daycare Provider', ['Overnight boarding', 'Dog daycare', 'Pet sitting', 'Drop-in visits'], ['pet sitter', 'dog daycare', 'boarding kennel'], false, ['kennel', 'animal boarding'])], ['pet sitting', 'dog daycare', 'boarding'], ['pet care', 'kennel']),
    c('animal-training', 'Animal Training & Behavior', [p('animal-trainer', 'Animal Trainer', ['Obedience training', 'Puppy classes', 'Behavior consultations', 'Service-dog training'], ['dog trainer', 'animal behaviorist'], false, ['obedience', 'behavior training'])], ['dog training', 'obedience training'], ['puppy classes', 'animal behavior']),
    c('other-pet-animal', 'Other Pet & Animal Services', [p('animal-services-provider', 'Pet & Animal Services Provider', ['Animal care consultation', 'Specialty animal services'], ['animal care provider'])], ['other animal care'], ['animal services', 'pet care']),
  ], ['veterinary', 'pet care', 'animal care'], ['vet', 'grooming', 'boarding', 'dog training']),

  i('environmental-sustainability', 'Environmental & Sustainability Services', 'Environmental consulting, renewable energy, recycling, conservation, and sustainability.', [
    c('environmental-consulting', 'Environmental Consulting & Compliance', [p('environmental-consultant', 'Environmental Consultant', ['Environmental assessments', 'Permitting support', 'Compliance audits', 'Remediation planning'], ['environmental scientist', 'environmental engineer'], false, ['environmental compliance', 'site assessment'])], ['environmental science', 'compliance'], ['remediation', 'environmental impact']),
    c('renewable-energy', 'Renewable Energy & Efficiency', [p('renewable-energy-provider', 'Renewable Energy Provider', ['Solar installation', 'Energy audits', 'Efficiency upgrades', 'Battery storage'], ['solar installer', 'energy consultant', 'green energy provider'], false, ['solar', 'clean energy'])], ['solar', 'clean energy'], ['energy efficiency', 'battery storage']),
    c('recycling-waste', 'Recycling & Waste Services', [p('recycling-provider', 'Recycling & Waste Services Provider', ['Recycling pickup', 'Waste reduction planning', 'Composting', 'Responsible disposal'], ['recycling company', 'waste management provider'], false, ['waste management', 'composting'])], ['waste management', 'recycling'], ['compost', 'waste reduction']),
    c('conservation-restoration', 'Conservation & Restoration', [p('conservation-provider', 'Conservation Services Provider', ['Habitat restoration', 'Land stewardship', 'Water conservation', 'Native planting'], ['conservationist', 'restoration ecologist'], false, ['ecology', 'land conservation'])], ['conservation', 'habitat restoration'], ['stewardship', 'native plants']),
    c('sustainable-building', 'Sustainable Building & Materials', [p('sustainable-building-provider', 'Sustainable Building Provider', ['Green building consulting', 'Sustainable materials', 'Building performance review'], ['green builder', 'sustainability consultant'], false, ['green building', 'low carbon'])], ['green building', 'sustainable construction'], ['energy efficient buildings', 'sustainable materials']),
    c('other-environmental', 'Other Environmental & Sustainability Services', [p('sustainability-specialist', 'Environmental & Sustainability Specialist', ['Sustainability planning', 'Environmental services'], ['sustainability professional'])], ['other sustainability services'], ['climate', 'environment']),
  ], ['green services', 'environmental services', 'sustainability'], ['solar', 'recycling', 'conservation', 'environmental compliance']),

  i('events-entertainment', 'Events & Entertainment', 'Event planning, venues, production, performers, and entertainment services.', [
    c('venues', 'Event Venues & Banquet Halls', [p('venue-coordinator', 'Venue Manager', ['Wedding receptions', 'Conferences', 'Banquets', 'Venue coordination'], ['event venue', 'banquet hall', 'venue operator'], false, ['event space', 'reception venue'])], ['event venue', 'banquet hall'], ['wedding venue', 'conference venue']),
    c('event-services', 'Event Planning & Coordination', [p('event-planner', 'Event Planner', ['Event coordination', 'Wedding planning', 'Conference planning', 'Decor and vendor management'], ['event coordinator', 'wedding planner', 'party planner'], false, ['event management', 'coordination'])], ['event planning', 'wedding planning'], ['conference planning', 'vendor coordination']),
    c('event-production', 'Event Production & Rentals', [p('event-production-provider', 'Event Production Provider', ['Audio and lighting', 'Stage production', 'AV rental', 'Event setup'], ['event production company', 'AV rental provider'], false, ['sound and lighting', 'stage production'])], ['AV production', 'event rentals'], ['lighting', 'staging', 'sound']),
    c('live-entertainment', 'Live Entertainment & Performance', [p('performing-artist', 'Performing Artist', ['Live music', 'Concert performance', 'Theater performance', 'Audience entertainment'], ['performer', 'entertainer', 'live musician'], false, ['live entertainment', 'performing arts'])], ['performer', 'entertainer'], ['concerts', 'theater', 'live music']),
    c('party-rentals', 'Party & Event Rentals', [p('event-rental-provider', 'Event Rental Provider', ['Tables and chairs', 'Tents and canopies', 'Linens', 'Party equipment rental'], ['party rental company', 'event hire'], false, ['tent rental', 'party supplies'])], ['party rentals', 'event rentals'], ['tents', 'tables', 'chairs']),
    c('other-events-entertainment', 'Other Events & Entertainment', [p('event-entertainment-specialist', 'Events & Entertainment Specialist', ['Event consultation', 'Entertainment services'], ['event professional'])], ['other event services'], ['events', 'entertainment']),
  ], ['event services', 'event planning', 'live entertainment'], ['weddings', 'conferences', 'venues', 'performers']),
];

/** Curated alternate spellings, abbreviations, and related search terms for the legacy catalog. */
export const TAXONOMY_TERM_OVERRIDES: Record<string, { aliases?: string[]; keywords?: string[] }> = {
  'food-beverage': { aliases: ['Food and Drink', 'Foodservice', 'F&B'], keywords: ['restaurant', 'bakery', 'catering', 'hospitality', 'beverage'] },
  'professional-business-services': { aliases: ['Business Services', 'B2B Services', 'Professional Services'], keywords: ['consulting', 'staffing', 'operations', 'advisory'] },
  'construction-skilled-trades': { aliases: ['Construction', 'Skilled Trades', 'Building Trades'], keywords: ['contractor', 'builder', 'plumbing', 'electrical', 'HVAC'] },
  'healthcare-wellness': { aliases: ['Healthcare', 'Health Care', 'Medical Services'], keywords: ['doctor', 'clinic', 'therapy', 'wellness', 'patient care'] },
  'retail-consumer': { aliases: ['Retail', 'Consumer Goods', 'Shops'], keywords: ['store', 'shop', 'ecommerce', 'e-commerce', 'merchandise'] },
  'financial-services': { aliases: ['Finance', 'Accounting and Insurance', 'Financial Services'], keywords: ['CPA', 'tax', 'bookkeeping', 'banking', 'insurance'] },
  'real-estate-property': { aliases: ['Realty', 'Property Services', 'Real Estate'], keywords: ['realtor', 'broker', 'property manager', 'homes'] },
  'education': { aliases: ['Education', 'Child Care', 'Learning Services'], keywords: ['school', 'teacher', 'tutor', 'preschool', 'daycare'] },
  'arts-media-entertainment': { aliases: ['Creative Services', 'Design and Media', 'Arts and Media'], keywords: ['graphic design', 'content creator', 'video', 'photography', 'publishing'] },
  'information-technology': { aliases: ['IT', 'Information Technology', 'Tech'], keywords: ['software', 'SaaS', 'cloud', 'web development', 'technical support'] },
  'nonprofit-civic': { aliases: ['Nonprofit', 'Not-for-Profit', 'Community Organization'], keywords: ['charity', 'NGO', 'community service', 'foundation'] },
  'religious-organizations': { aliases: ['Churches', 'Ministries', 'Faith Organizations'], keywords: ['congregation', 'parish', 'mission', 'worship'] },
  'travel-hospitality': { aliases: ['Travel', 'Tourism', 'Lodging'], keywords: ['hotel', 'tour', 'travel agent', 'accommodation'] },
  'automotive': { aliases: ['Auto', 'Car Services', 'Motor Vehicle Services'], keywords: ['mechanic', 'auto repair', 'car dealer', 'collision'] },
  'beauty-personal-care': { aliases: ['Beauty', 'Personal Care', 'Salon Services'], keywords: ['barber', 'hair', 'skincare', 'spa', 'esthetician'] },
  'sports-recreation': { aliases: ['Fitness', 'Sports', 'Recreation'], keywords: ['gym', 'trainer', 'athletics', 'outdoor activities'] },
  'security-services': { aliases: ['Security', 'Private Investigation', 'Investigative Services'], keywords: ['guard', 'surveillance', 'investigator', 'background checks'] },
  'other-industries': { aliases: ['Other Industry', 'Other Services', 'Miscellaneous'], keywords: ['custom category', 'specialty service'] },
  'marketing-advertising-pr': { aliases: ['Marketing', 'Advertising', 'PR', 'Public Relations', 'MarCom'], keywords: ['digital marketing', 'SEO', 'campaign', 'publicity'] },
  'legal-service-industry': { aliases: ['Legal', 'Law', 'Lawyers', 'Attorneys'], keywords: ['law firm', 'counsel', 'mediation', 'legal aid'] },
  'home-property-services': { aliases: ['Home Services', 'Property Care', 'Home Improvement'], keywords: ['handyman', 'lawn', 'pest control', 'home repair'] },
  'transportation-logistics': { aliases: ['Transportation', 'Logistics', 'Freight', 'Delivery'], keywords: ['moving', 'courier', 'shuttle', 'supply chain'] },
  'agriculture-farming': { aliases: ['Agriculture', 'Farming', 'Farm Services'], keywords: ['farmer', 'ranch', 'crop', 'livestock', 'agronomy'] },
  'manufacturing': { aliases: ['Manufacturing', 'Industrial Production', 'Makers'], keywords: ['factory', 'fabrication', 'assembly', 'production'] },
  'government-civic-services': { aliases: ['Government', 'Civic Services', 'Public Sector'], keywords: ['municipal', 'county', 'public works', 'agency'] },
  'cleaning-maintenance': { aliases: ['Cleaning', 'Janitorial', 'Facility Maintenance'], keywords: ['cleaner', 'housekeeping', 'building maintenance'] },
  'pet-animal-services': { aliases: ['Pet Care', 'Animal Services', 'Veterinary'], keywords: ['vet', 'grooming', 'boarding', 'dog training'] },
  'environmental-sustainability': { aliases: ['Environmental Services', 'Green Services', 'Sustainability'], keywords: ['renewable energy', 'recycling', 'conservation', 'solar'] },
  'events-entertainment': { aliases: ['Events', 'Entertainment', 'Event Planning'], keywords: ['venue', 'wedding planner', 'performer', 'event production'] },
  'managed-it-provider': { aliases: ['IT Support', 'IT Services', 'Managed IT'], keywords: ['help desk', 'computer support', 'network support', 'MSP'] },
  'floral-designer': { aliases: ['Florist', 'Flower Shop', 'Floral Designer'], keywords: ['floral arrangements', 'bouquets', 'flowers'] },
  'attorney': { aliases: ['Lawyer', 'Counsel', 'Solicitor'], keywords: ['legal advice', 'law firm', 'litigation'] },
  'cpa': { aliases: ['CPA', 'Accountant', 'Certified Public Accountant'], keywords: ['tax preparer', 'bookkeeper', 'audit'] },
  'realtor': { aliases: ['Real Estate Agent', 'Realtor', 'Broker'], keywords: ['realty', 'home buyer', 'listing agent'] },
  'psychologist': { aliases: ['Psychologist', 'Clinical Psychologist', 'Psychotherapist'], keywords: ['mental health', 'therapy', 'psychology'] },
  'pest-control-specialist': { aliases: ['Pest Control', 'Exterminator'], keywords: ['termite', 'rodent control', 'insect control'] },
};

/** Alternate older top-level labels/slugs retained as resolvable aliases. */
export const LEGACY_INDUSTRY_SLUG_ALIASES: Record<string, string> = {
  'food-drink': 'food-beverage',
  'professional-services': 'professional-business-services',
  'home-services': 'home-property-services',
  'health-medical': 'healthcare-wellness',
  'shopping': 'retail-consumer',
  'arts-entertainment': 'arts-media-entertainment',
  'travel-lodging': 'travel-hospitality',
  'retail': 'retail-consumer',
  'fitness': 'sports-recreation',
  'accounting-tax': 'financial-services',
  'insurance': 'financial-services',
  'publishing': 'arts-media-entertainment',
  'music-education': 'education',
  'legal-services': 'legal-service-industry',
};

/** Old profession identifiers are normalized on read/write; listing-profession FK rows remain intact. */
export const LEGACY_PROFESSION_SLUG_ALIASES: Record<string, string> = {
  'it-support': 'managed-it-provider',
  'florist': 'floral-designer',
  'pest-control': 'pest-control-specialist',
  'general-specialist': 'other-professional-service-provider',
};

/** Previous industry/category pairs accepted for old saved forms and external clients. */
export const LEGACY_CATEGORY_PARENTS: Record<string, string[]> = {
  marketing: ['professional-business-services'],
  'legal-services': ['professional-business-services'],
  landscaping: ['construction-skilled-trades'],
  'other-home-services': ['construction-skilled-trades'],
  'cleaning-services': ['construction-skilled-trades'],
  fitness: ['healthcare-wellness'],
  venues: ['travel-hospitality'],
  'event-services': ['travel-hospitality'],
};
