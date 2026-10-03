import { BASE_INDUSTRIES, type Category, type Industry, type Profession } from './industries.base';
import {
  LEGACY_CATEGORY_PARENTS,
  LEGACY_INDUSTRY_SLUG_ALIASES,
  LEGACY_PROFESSION_SLUG_ALIASES,
  TAXONOMY_INDUSTRY_ADDITIONS,
  TAXONOMY_TERM_OVERRIDES,
} from './taxonomy-extension';

export type { Category, Industry, Profession } from './industries.base';

/** Required broad-sector coverage. The legal root uses a distinct slug because `legal-services` is a longstanding category slug. */
export const REQUIRED_INDUSTRY_SLUGS = [
  'information-technology', 'professional-business-services', 'marketing-advertising-pr',
  'arts-media-entertainment', 'construction-skilled-trades', 'home-property-services',
  'healthcare-wellness', 'education', 'food-beverage', 'retail-consumer',
  'financial-services', 'legal-service-industry', 'real-estate-property',
  'transportation-logistics', 'automotive', 'agriculture-farming', 'manufacturing',
  'beauty-personal-care', 'sports-recreation', 'events-entertainment',
  'religious-organizations', 'nonprofit-civic', 'government-civic-services',
  'cleaning-maintenance', 'security-services', 'pet-animal-services',
  'travel-hospitality', 'environmental-sustainability', 'other-industries',
] as const;

const MOVED_CATEGORIES: Record<string, string> = {
  marketing: 'marketing-advertising-pr',
  'legal-services': 'legal-service-industry',
  landscaping: 'home-property-services',
  'other-home-services': 'home-property-services',
  'cleaning-services': 'cleaning-maintenance',
  fitness: 'sports-recreation',
  venues: 'events-entertainment',
  'event-services': 'events-entertainment',
};

const BASE_DISPLAY: Record<string, Partial<Industry>> = {
  'food-beverage': { name: 'Food, Beverage & Hospitality' },
  'professional-business-services': { name: 'Professional & Business Services' },
  'construction-skilled-trades': { name: 'Construction & Skilled Trades', description: 'General contractors, remodelers, electricians, plumbers, and specialty trades.' },
  'healthcare-wellness': { name: 'Health, Medical & Wellness' },
  'arts-media-entertainment': { name: 'Creative, Design & Media' },
  'information-technology': { name: 'Technology & Software' },
  'sports-recreation': { name: 'Fitness & Recreation' },
  'other-industries': { name: 'Other Industry', description: 'A universal fallback for an industry not listed elsewhere.' },
};

const normalizeText = (value: string) => value.trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
const normalizeAliasSlug = (value: string) => value.trim().toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const uniqueTerms = (values: Array<string | undefined>) => {
  const seen = new Set<string>();
  return values.flatMap((raw) => {
    const value = raw?.trim().replace(/\s+/g, ' ');
    if (!value) return [];
    const key = normalizeText(value);
    if (seen.has(key)) return [];
    seen.add(key);
    return [value];
  });
};

function addTerms<T extends { slug: string; name: string; aliases?: string[]; keywords?: string[] }>(node: T): T & { aliases: string[]; keywords: string[] } {
  const override = TAXONOMY_TERM_OVERRIDES[node.slug];
  const aliases = uniqueTerms([...(node.aliases ?? []), ...(override?.aliases ?? []), node.name, node.slug.replace(/-/g, ' ')]);
  const keywords = uniqueTerms([
    ...(node.keywords ?? []),
    ...(override?.keywords ?? []),
    node.name,
    node.slug.replace(/-/g, ' '),
    ...aliases,
  ]);
  return { ...node, aliases, keywords };
}

const moved = new Map<string, Category>();
const legacyRoots = BASE_INDUSTRIES.map((industry) => {
  const categories = industry.categories.filter((category) => {
    if (!MOVED_CATEGORIES[category.slug]) return true;
    moved.set(category.slug, category);
    return false;
  });
  return { ...industry, ...BASE_DISPLAY[industry.slug], categories };
});

const allRoots = [...legacyRoots, ...TAXONOMY_INDUSTRY_ADDITIONS];
for (const [categorySlug, industrySlug] of Object.entries(MOVED_CATEGORIES)) {
  const target = allRoots.find((industry) => industry.slug === industrySlug);
  const category = moved.get(categorySlug);
  if (target && category && !target.categories.some((item) => item.slug === categorySlug)) target.categories.unshift(category);
}

// Resolve legacy profession identifiers and the source catalog's duplicate profession name/slug.
for (const industry of allRoots) {
  for (const category of industry.categories) {
    if (industry.slug === 'other-industries' && category.slug === 'other-business') category.name = 'Other Category';
    if (category.slug === 'bakeries') category.professions = category.professions.filter((profession) => profession.slug !== 'caterer');
    category.professions = category.professions.map((profession) => {
      if (profession.slug === 'it-support') return { ...profession, slug: 'managed-it-provider', aliases: [...(profession.aliases ?? []), 'IT support'] };
      if (profession.slug === 'florist') return { ...profession, slug: 'floral-designer', aliases: [...(profession.aliases ?? []), 'Florist', 'Flower Shop'] };
      if (profession.slug === 'general-specialist') return { ...profession, slug: 'other-professional-service-provider', name: 'Other Professional or Service Provider', aliases: [...(profession.aliases ?? []), 'Specialist', 'General service provider'] };
      return profession;
    });
  }
}

const categoryByMutableSlug = (slug: string) => allRoots.flatMap((industry) => industry.categories).find((category) => category.slug === slug);
const addProfession = (categorySlug: string, profession: Profession) => {
  const category = categoryByMutableSlug(categorySlug);
  if (category && !category.professions.some((item) => item.slug === profession.slug)) category.professions.push(profession);
};
// Keep profession identifiers used by existing bundled listings available in the canonical tree.
addProfession('salon', { slug: 'barber', name: 'Barber', aliases: ['Barber Shop', 'Barbershop'], keywords: ['men’s cuts', 'shaves'], services: ['Haircuts', 'Straight-razor shaves', 'Beard grooming'] });
addProfession('music', { slug: 'worship-artist', name: 'Worship Artist', aliases: ['Worship musician', 'Christian musician'], keywords: ['worship band', 'church music'], services: ['Worship leading', 'Live music', 'Songwriting'] });
addProfession('publishing', { slug: 'author', name: 'Author', aliases: ['Writer', 'Christian author'], keywords: ['books', 'writing'], services: ['Book writing', 'Speaking', 'Publishing consultation'] });
addProfession('community-outreach', { slug: 'volunteer-coordinator', name: 'Volunteer Coordinator', aliases: ['Volunteer manager'], keywords: ['volunteer recruitment', 'volunteer management'], services: ['Volunteer recruitment', 'Volunteer scheduling', 'Training'] });
addProfession('mental-health', { slug: 'psychologist', name: 'Psychologist', aliases: ['Clinical psychologist', 'Psychotherapist'], keywords: ['psychology', 'mental health'], services: ['Psychological assessment', 'Individual therapy', 'Consultation'], requiresLicense: true });

// Every root has an "Other …" option; keep legacy category identifiers intact.
const construction = allRoots.find((industry) => industry.slug === 'construction-skilled-trades')!;
construction.categories.push({
  slug: 'other-construction-trades', name: 'Other Construction & Skilled Trades', aliases: ['Other trades', 'Specialty contractor'], keywords: ['construction', 'trade services'],
  professions: [{ slug: 'construction-trades-specialist', name: 'Construction & Skilled Trades Specialist', aliases: ['Trade professional'], keywords: ['specialty trade'], services: ['Specialty trade work', 'Construction consultation'] }],
});
const food = allRoots.find((industry) => industry.slug === 'food-beverage')!;
food.categories.push(
  { slug: 'bars-breweries-wineries', name: 'Bars, Breweries & Wineries', aliases: ['Bar', 'Craft brewery', 'Winery'], keywords: ['taproom', 'tasting room', 'craft beer'], professions: [{ slug: 'beverage-hospitality-provider', name: 'Beverage Hospitality Provider', aliases: ['Brewery owner', 'Winemaker', 'Bar operator'], keywords: ['brewery', 'winery', 'bar'], services: ['Beverage service', 'Tastings', 'Private events'] }] },
  { slug: 'food-service', name: 'Food Service & Prepared Meals', aliases: ['Meal prep', 'Quick service restaurant'], keywords: ['takeout', 'meal delivery', 'prepared food'], professions: [{ slug: 'food-service-provider', name: 'Food Service Provider', aliases: ['Meal prep company', 'Restaurant operator'], keywords: ['prepared meals', 'food delivery'], services: ['Meal preparation', 'Takeout', 'Food delivery'] }] },
);
const arts = allRoots.find((industry) => industry.slug === 'arts-media-entertainment')!;
arts.categories.push(
  { slug: 'design-services', name: 'Design & Creative Services', aliases: ['Creative studio', 'Visual design'], keywords: ['UX', 'UI', 'brand design'], professions: [{ slug: 'creative-designer', name: 'Creative Designer', aliases: ['Visual designer', 'UX designer', 'UI designer'], keywords: ['user experience', 'user interface'], services: ['Brand design', 'UX and UI design', 'Creative direction'] }] },
  { slug: 'content-media', name: 'Content, Audio & Media Production', aliases: ['Podcast production', 'Audio production'], keywords: ['content creator', 'podcast', 'editing'], professions: [{ slug: 'media-content-producer', name: 'Media & Content Producer', aliases: ['Content creator', 'Podcast producer'], keywords: ['audio', 'video', 'content'], services: ['Podcast production', 'Audio editing', 'Content production'] }] },
);
const security = allRoots.find((industry) => industry.slug === 'security-services')!;
security.categories.push(
  { slug: 'private-investigation', name: 'Private Investigation & Investigative Services', aliases: ['Private investigator', 'PI'], keywords: ['background checks', 'surveillance', 'investigator'], professions: [{ slug: 'private-investigator', name: 'Private Investigator', aliases: ['Investigator', 'Detective'], keywords: ['investigative services', 'background investigation'], services: ['Background investigations', 'Locate services', 'Surveillance'] }] },
  { slug: 'other-security-services', name: 'Other Security & Investigative Services', aliases: ['Other security'], keywords: ['security provider'], professions: [{ slug: 'security-services-provider', name: 'Security Services Provider', aliases: ['Protective services provider'], keywords: ['security', 'safety'], services: ['Security consultation', 'Protective services'] }] },
);

/** Runtime tree: additions plus rehomed categories with their original slugs. */
export const INDUSTRIES: Industry[] = allRoots.map((industry) => ({
  ...addTerms(industry),
  categories: industry.categories.map((category) => ({
    ...addTerms(category),
    professions: category.professions.map((profession) => ({
      ...addTerms(profession),
      services: uniqueTerms(profession.services ?? []),
    })),
  })),
}));

export interface TaxonomyProfession extends Profession { industrySlug: string; categorySlug: string }
export interface TaxonomyIssue { path: string; message: string }

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function canonicalIndustrySlug(slug: string | undefined | null): string | undefined {
  if (!slug) return undefined;
  const raw = slug.trim().toLowerCase();
  const canonical = LEGACY_INDUSTRY_SLUG_ALIASES[raw] ?? raw;
  return INDUSTRIES.find((industry) => industry.slug === canonical || industry.aliases?.some((alias) => normalizeText(alias) === normalizeText(raw)))?.slug;
}

export function canonicalProfessionSlug(slug: string | undefined | null): string | undefined {
  if (!slug) return undefined;
  const raw = slug.trim().toLowerCase();
  const canonical = LEGACY_PROFESSION_SLUG_ALIASES[raw] ?? raw;
  return allProfessions().find((profession) => profession.slug === canonical || profession.aliases?.some((alias) => normalizeAliasSlug(alias) === raw))?.slug;
}

export function industryBySlug(slug: string) {
  const canonical = canonicalIndustrySlug(slug);
  return INDUSTRIES.find((industry) => industry.slug === canonical);
}

export function categoryBySlug(categorySlug: string) {
  const raw = categorySlug.trim().toLowerCase();
  for (const industry of INDUSTRIES) {
    const found = industry.categories.find((category) => category.slug === raw || category.aliases?.some((alias) => normalizeAliasSlug(alias) === raw));
    if (found) return { category: found, industry };
  }
  return undefined;
}

export const allProfessions = (): TaxonomyProfession[] => INDUSTRIES.flatMap((industry) =>
  industry.categories.flatMap((category) => category.professions.map((profession) => ({
    ...profession, industrySlug: industry.slug, categorySlug: category.slug,
  }))),
);

export function professionBySlug(slug: string) {
  const canonical = canonicalProfessionSlug(slug);
  return allProfessions().find((profession) => profession.slug === canonical);
}

export function categoryBelongsToIndustry(industrySlug: string, categorySlug: string): boolean {
  const category = categoryBySlug(categorySlug);
  const industry = canonicalIndustrySlug(industrySlug);
  if (!category || !industry) return false;
  if (category.industry.slug === industry) return true;
  return (LEGACY_CATEGORY_PARENTS[category.category.slug] ?? []).some((legacy) => canonicalIndustrySlug(legacy) === industry);
}

export function validateTaxonomySelection(selection: {
  industrySlug?: string | null;
  categorySlug?: string | null;
  industries?: string[];
  professions?: string[];
  customProfession?: string | null;
  customProfessions?: string[];
  customCategory?: string | null;
  services?: string[];
}): TaxonomyIssue[] {
  const issues: TaxonomyIssue[] = [];
  const industrySlug = selection.industrySlug?.trim();
  const categorySlug = selection.categorySlug?.trim();
  const category = categorySlug ? categoryBySlug(categorySlug) : undefined;
  if (industrySlug && !canonicalIndustrySlug(industrySlug)) issues.push({ path: 'industrySlug', message: 'Choose a valid industry.' });
  for (const rawIndustry of selection.industries ?? []) {
    if (!canonicalIndustrySlug(rawIndustry)) issues.push({ path: 'industries', message: `Unknown industry: ${rawIndustry}.` });
  }
  const selectedIndustries = new Set([industrySlug, ...(selection.industries ?? [])].map((slug) => canonicalIndustrySlug(slug ?? '')).filter((slug): slug is string => Boolean(slug)));
  if (selectedIndustries.size > 12) issues.push({ path: 'industries', message: 'Choose no more than 12 industries.' });
  if (categorySlug && !category) issues.push({ path: 'categorySlug', message: 'Choose a valid category.' });
  if (category && industrySlug && !categoryBelongsToIndustry(industrySlug, categorySlug!)) {
    issues.push({ path: 'categorySlug', message: 'That category does not belong to the selected industry.' });
  }
  if ((selection.professions?.length ?? 0) && !category) issues.push({ path: 'professions', message: 'Choose an industry and category before selecting professions.' });
  for (const rawSlug of selection.professions ?? []) {
    const slug = canonicalProfessionSlug(rawSlug);
    const profession = slug ? allProfessions().find((item) => item.slug === slug) : undefined;
    if (!profession) issues.push({ path: 'professions', message: `Unknown profession: ${rawSlug}.` });
    else if (category && profession.categorySlug !== category.category.slug) issues.push({ path: 'professions', message: `${profession.name} does not belong to the selected category.` });
  }
  const customProfessions = [...(selection.customProfessions ?? []), ...(selection.customProfession ? [selection.customProfession] : [])].map((value) => value.trim()).filter(Boolean);
  if (customProfessions.length && !category) issues.push({ path: 'customProfessions', message: 'Choose a category before adding a custom profession.' });
  const customSeen = new Set<string>();
  for (const value of customProfessions) {
    const key = normalizeText(value);
    if (customSeen.has(key)) issues.push({ path: 'customProfessions', message: `Duplicate custom profession: ${value}.` });
    customSeen.add(key);
    const canonicalName = category?.category.professions.find((profession) => normalizeText(profession.name) === key);
    if (canonicalName) issues.push({ path: 'customProfessions', message: `${value} is already available as a profession in this category.` });
  }
  if ((selection.services?.length ?? 0) && !category) issues.push({ path: 'services', message: 'Choose a category before adding services.' });
  const serviceSeen = new Set<string>();
  for (const service of selection.services ?? []) {
    const key = normalizeText(service);
    if (serviceSeen.has(key)) issues.push({ path: 'services', message: `Duplicate service: ${service}.` });
    serviceSeen.add(key);
  }
  return issues;
}

export function validateTaxonomy(taxonomy: Industry[] = INDUSTRIES): TaxonomyIssue[] {
  const issues: TaxonomyIssue[] = [];
  const slugOwners = new Map<string, string>();
  const professionNames = new Map<string, string>();
  const categoryParents = new Map<string, string>();
  const registerSlug = (slug: string, path: string) => {
    if (!slugPattern.test(slug)) issues.push({ path, message: `Invalid taxonomy slug: ${slug}` });
    const previous = slugOwners.get(slug);
    if (previous) issues.push({ path, message: `Duplicate slug "${slug}" (also used at ${previous}).` });
    else slugOwners.set(slug, path);
  };
  const checkTerms = (node: { aliases?: string[]; keywords?: string[] }, path: string) => {
    for (const key of ['aliases', 'keywords'] as const) {
      const seen = new Set<string>();
      (node[key] ?? []).forEach((value, index) => {
        if (!value.trim()) issues.push({ path: `${path}.${key}[${index}]`, message: 'Alias/keyword cannot be blank.' });
        const norm = normalizeText(value);
        if (seen.has(norm)) issues.push({ path, message: `Duplicate ${key} entry: ${value}.` });
        seen.add(norm);
      });
    }
  };
  taxonomy.forEach((industry, iIndex) => {
    const industryPath = `industries[${iIndex}](${industry.slug})`;
    registerSlug(industry.slug, industryPath);
    checkTerms(industry, industryPath);
    industry.categories.forEach((category, cIndex) => {
      const categoryPath = `${industryPath}.categories[${cIndex}](${category.slug})`;
      registerSlug(category.slug, categoryPath);
      checkTerms(category, categoryPath);
      categoryParents.set(category.slug, industry.slug);
      category.professions.forEach((profession, pIndex) => {
        const professionPath = `${categoryPath}.professions[${pIndex}](${profession.slug})`;
        registerSlug(profession.slug, professionPath);
        checkTerms(profession, professionPath);
        const nameKey = normalizeText(profession.name);
        const previous = professionNames.get(nameKey);
        if (previous) issues.push({ path: professionPath, message: `Duplicate profession name "${profession.name}" (also at ${previous}).` });
        else professionNames.set(nameKey, professionPath);
        if (!profession.services?.length) issues.push({ path: professionPath, message: 'Every profession needs at least one service example.' });
        const serviceNames = new Set<string>();
        (profession.services ?? []).forEach((service, index) => {
          if (!service.trim()) issues.push({ path: `${professionPath}.services[${index}]`, message: 'Service example cannot be blank.' });
          const key = normalizeText(service);
          if (serviceNames.has(key)) issues.push({ path: professionPath, message: `Duplicate service example: ${service}.` });
          serviceNames.add(key);
        });
      });
    });
  });
  const available = new Set(taxonomy.map((industry) => industry.slug));
  for (const [categorySlug, targetIndustry] of Object.entries(MOVED_CATEGORIES)) {
    const actualParent = categoryParents.get(categorySlug);
    if (actualParent && actualParent !== targetIndustry) issues.push({ path: `categories.${categorySlug}`, message: `Category should be rehomed under ${targetIndustry}, not ${actualParent}.` });
  }
  for (const required of REQUIRED_INDUSTRY_SLUGS) if (!available.has(required)) issues.push({ path: 'industries', message: `Required industry is missing: ${required}.` });
  const otherIndustry = taxonomy.find((industry) => industry.slug === 'other-industries');
  if (!otherIndustry || otherIndustry.name !== 'Other Industry') issues.push({ path: 'industries.other-industries', message: 'Universal Other Industry fallback is required.' });
  const otherCategory = otherIndustry?.categories.find((category) => category.name === 'Other Category');
  if (!otherCategory) issues.push({ path: 'industries.other-industries.categories', message: 'Universal Other Category fallback is required.' });
  if (!otherCategory?.professions.some((profession) => profession.name === 'Other Professional or Service Provider')) issues.push({ path: 'industries.other-industries.categories', message: 'Universal Other Professional or Service Provider fallback is required.' });
  for (const [alias, target] of Object.entries(LEGACY_INDUSTRY_SLUG_ALIASES)) {
    if (!slugPattern.test(alias)) issues.push({ path: `industryAliases.${alias}`, message: `Invalid legacy industry slug: ${alias}.` });
    if (!available.has(target)) issues.push({ path: `industryAliases.${alias}`, message: `Legacy industry alias points to missing target: ${target}.` });
  }
  const categorySlugs = new Set(taxonomy.flatMap((industry) => industry.categories.map((category) => category.slug)));
  for (const [categorySlug, parents] of Object.entries(LEGACY_CATEGORY_PARENTS)) {
    if (!categorySlugs.has(categorySlug)) issues.push({ path: `legacyCategoryParents.${categorySlug}`, message: 'Legacy category-parent mapping points to a missing category.' });
    for (const parent of parents) if (!available.has(canonicalIndustrySlug(parent) ?? parent)) issues.push({ path: `legacyCategoryParents.${categorySlug}`, message: `Legacy parent industry is missing: ${parent}.` });
  }
  const professionSlugs = new Set(allProfessions().map((profession) => profession.slug));
  for (const [alias, target] of Object.entries(LEGACY_PROFESSION_SLUG_ALIASES)) {
    if (!slugPattern.test(alias)) issues.push({ path: `professionAliases.${alias}`, message: `Invalid legacy profession slug: ${alias}.` });
    if (!professionSlugs.has(target)) issues.push({ path: `professionAliases.${alias}`, message: `Legacy profession alias points to missing target: ${target}.` });
  }
  return issues;
}

export function taxonomyTermsForSlug(rawSlug: string): string[] {
  const industry = industryBySlug(rawSlug);
  if (industry) return [industry.name, ...(industry.aliases ?? []), ...(industry.keywords ?? [])];
  const profession = professionBySlug(rawSlug);
  if (!profession) {
    const category = categoryBySlug(rawSlug);
    if (category) return [category.industry.name, category.category.name, ...(category.category.aliases ?? []), ...(category.category.keywords ?? [])];
  }
  if (profession) {
    const categoryMatch = categoryBySlug(profession.categorySlug);
    const industryMatch = industryBySlug(profession.industrySlug);
    return [profession.slug, industryMatch?.name ?? profession.industrySlug, categoryMatch?.category.name ?? profession.categorySlug, profession.name, ...(profession.aliases ?? []), ...(profession.keywords ?? []), ...(profession.services ?? [])];
  }
  return [];
}

export function normalizeListingProfessions(values: string[] = []): string[] {
  return [...new Set(values.map(canonicalProfessionSlug).filter((value): value is string => Boolean(value)))];
}

export function listingMatchesIndustry(listing: { industrySlug?: string; categorySlug?: string; industries?: string[]; professions?: string[] }, targetSlug: string): boolean {
  const target = canonicalIndustrySlug(targetSlug);
  if (!target) return false;
  const direct = [listing.industrySlug, ...(listing.industries ?? [])].filter(Boolean).some((value) => canonicalIndustrySlug(value) === target);
  if (direct) return true;
  if (listing.categorySlug && categoryBySlug(listing.categorySlug)?.industry.slug === target) return true;
  if ((listing.industries ?? []).some((slug) => categoryBySlug(slug)?.industry.slug === target)) return true;
  return (listing.professions ?? []).some((slug) => {
    const profession = professionBySlug(slug);
    return profession?.industrySlug === target;
  });
}

export const taxonomySlugAliases = {
  industries: LEGACY_INDUSTRY_SLUG_ALIASES,
  professions: LEGACY_PROFESSION_SLUG_ALIASES,
  categoryParents: LEGACY_CATEGORY_PARENTS,
};
