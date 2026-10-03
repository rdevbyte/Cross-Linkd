import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  INDUSTRIES,
  REQUIRED_INDUSTRY_SLUGS,
  allProfessions,
  categoryBelongsToIndustry,
  categoryBySlug,
  canonicalIndustrySlug,
  canonicalProfessionSlug,
  industryBySlug,
  normalizeListingProfessions,
  professionBySlug,
  taxonomyTermsForSlug,
  validateTaxonomy,
  validateTaxonomySelection,
} from '../src/data/industries.ts';
import { searchListings } from '../src/lib/search.ts';
import { listingInputSchema, listingPatchSchema } from '../src/lib/validation.ts';
import { mapListingRow, rowToFormValues, resolveListingStatus } from '../src/lib/submissions.ts';
import {
  calculateTaxonomyConfidence, extractTaxonomyKeywords, generateTaxonomyCandidates, normalizeRecommendationText,
  recommendTaxonomy, scoreTaxonomyCandidate, selectOtherFallback, tokenizeTaxonomyText,
} from '../src/lib/taxonomyRecommendations.ts';
import { isTaxonomyRecommendationField } from '../src/lib/taxonomyRecommendationFields.mjs';

const fixture = (overrides = {}) => ({
  id: 'taxonomy-fixture', slug: 'fixture', name: 'Local Pest Control', typeSlug: 'business',
  tagline: 'Termite and pest services', description: 'Home property care and pest-control services.',
  city: 'Raleigh', region: 'NC', country: 'United States', postalCode: '27601',
  industrySlug: 'home-property-services', categorySlug: 'pest-control',
  industries: ['home-property-services'], professions: ['pest-control'],
  services: ['Termite treatment', 'Rodent control'], hashtags: [], denominations: [],
  verified: false, claimed: false, isOnlineOnly: false, openNow: false,
  rating: 0, reviewCount: 0, featured: false, addedDaysAgo: 0, recommendations: 0, views: 0,
  languages: ['English'], accessibility: [], priceRange: '$$', ...overrides,
});

test('canonical catalog covers required top-level sectors and passes integrity validation', () => {
  assert.deepEqual(validateTaxonomy(), []);
  const slugs = new Set(INDUSTRIES.map((industry) => industry.slug));
  for (const slug of REQUIRED_INDUSTRY_SLUGS) assert.ok(slugs.has(slug), `missing ${slug}`);
  assert.equal(INDUSTRIES.length, REQUIRED_INDUSTRY_SLUGS.length);
  assert.ok(allProfessions().every((profession) => profession.services.length > 0));
  assert.ok(INDUSTRIES.every((industry) => industry.aliases.length > 0 && industry.keywords.length > 0));
  assert.ok(INDUSTRIES.flatMap((industry) => industry.categories).every((category) => category.aliases.length > 0 && category.keywords.length > 0));
  assert.ok(allProfessions().every((profession) => profession.aliases.length > 0 && profession.keywords.length > 0));
});

test('universal Other fallbacks are discoverable and stable', () => {
  const otherIndustry = industryBySlug('other-industries');
  assert.equal(otherIndustry?.name, 'Other Industry');
  const otherCategory = otherIndustry?.categories.find((category) => category.name === 'Other Category');
  assert.ok(otherCategory);
  assert.ok(otherCategory.professions.some((profession) => profession.name === 'Other Professional or Service Provider'));
});

test('legacy industry and profession slugs resolve to canonical entries', () => {
  assert.equal(canonicalIndustrySlug('home-services'), 'home-property-services');
  assert.equal(canonicalIndustrySlug('retail'), 'retail-consumer');
  assert.equal(canonicalIndustrySlug('legal-services'), 'legal-service-industry');
  assert.equal(canonicalProfessionSlug('it-support'), 'managed-it-provider');
  assert.equal(canonicalProfessionSlug('florist'), 'floral-designer');
  assert.equal(canonicalProfessionSlug('general-specialist'), 'other-professional-service-provider');
  assert.equal(professionBySlug('pest-control')?.slug, 'pest-control-specialist');
  assert.deepEqual(normalizeListingProfessions(['it-support', 'managed-it-provider', 'bad-value']), ['managed-it-provider']);
});

test('moved categories keep their slugs while legacy parent pairs remain accepted', () => {
  assert.equal(categoryBySlug('landscaping')?.industry.slug, 'home-property-services');
  assert.equal(categoryBySlug('legal-services')?.industry.slug, 'legal-service-industry');
  assert.equal(categoryBelongsToIndustry('construction-skilled-trades', 'landscaping'), true);
  assert.equal(categoryBelongsToIndustry('travel-hospitality', 'venues'), true);
  assert.equal(categoryBelongsToIndustry('food-beverage', 'landscaping'), false);
});

test('selection validation enforces category/profession hierarchy and permits custom entries', () => {
  assert.deepEqual(validateTaxonomySelection({ industrySlug: 'home-services', categorySlug: 'pest-control', professions: ['pest-control'] }), []);
  assert.ok(validateTaxonomySelection({ industrySlug: 'food-beverage', categorySlug: 'pest-control' }).some((issue) => issue.path === 'categorySlug'));
  assert.ok(validateTaxonomySelection({ industrySlug: 'home-property-services', categorySlug: 'pest-control', professions: ['attorney'] }).some((issue) => issue.path === 'professions'));
  assert.deepEqual(validateTaxonomySelection({ industrySlug: 'other-industries', categorySlug: 'other-business', customProfession: 'Custom specialist', customCategory: 'Specialty service', services: ['Custom consultation'] }), []);
  assert.ok(validateTaxonomySelection({ industrySlug: 'other-industries', categorySlug: 'other-business', customProfessions: ['Baker', 'baker'] }).some((issue) => issue.path === 'customProfessions'));
  assert.ok(validateTaxonomySelection({ services: ['Custom service'] }).some((issue) => issue.path === 'services'));
});

test('taxonomy aliases, keywords, and service examples are available to search', () => {
  const terms = taxonomyTermsForSlug('it-support').map((value) => value.toLowerCase());
  assert.ok(terms.includes('managed-it-provider'));
  assert.ok(terms.includes('help desk'));
  assert.ok(allProfessions().some((profession) => profession.aliases.length && profession.keywords.length));
  assert.ok(allProfessions().some((profession) => profession.services.includes('Termite treatment')));
});

test('search uses legacy profession/industry aliases and category hierarchy', () => {
  const result = searchListings({ industry: ['home-services'], profession: ['pest-control'] }, [fixture()]);
  assert.ok(result.hits.some((hit) => hit.id === 'taxonomy-fixture'));
  const termResult = searchListings({ q: 'exterminator' }, [fixture()]);
  assert.ok(termResult.hits.some((hit) => hit.id === 'taxonomy-fixture'));
});


test('category search does not treat a parent industry or unrelated listing as a category match', () => {
  const legal = fixture({
    id: 'legal-fixture', slug: 'legal-fixture', name: 'Legal Aid',
    industrySlug: 'legal-service-industry', categorySlug: 'legal-services',
    industries: ['legal-service-industry'], professions: ['attorney'], services: ['Estate planning'],
  });
  assert.equal(searchListings({ category: ['pest-control'] }, [legal]).total, 0);
  assert.equal(searchListings({ category: ['legal-services'] }, [legal]).total, 1);
});

test('custom services and professions are hydrated into text and structured search', () => {
  const legacy = fixture({
    id: 'legacy-fixture', slug: 'legacy-fixture', industrySlug: 'home-services',
    categorySlug: 'pest-control', industries: ['home-services'], professions: ['pest-control'],
    customProfessions: ['Wildlife Consultant'], services: ['Bat exclusion'],
  });
  assert.equal(searchListings({ q: 'Wildlife Consultant' }, [legacy]).total, 1);
  assert.equal(searchListings({ service: ['bat exclusion'] }, [legacy]).total, 1);
  assert.equal(searchListings({ profession: ['pest-control-specialist'] }, [legacy]).total, 1);
  assert.equal(searchListings({ industry: ['home-property-services'] }, [legacy]).total, 1);
});

test('search pagination and newest sorting use the complete result count', () => {
  const corpus = [
    fixture({ id: 'newest', slug: 'newest', addedDaysAgo: 0 }),
    fixture({ id: 'middle', slug: 'middle', addedDaysAgo: 4 }),
    fixture({ id: 'oldest', slug: 'oldest', addedDaysAgo: 12 }),
  ];
  const first = searchListings({ sort: 'newest', page: 1, perPage: 1 }, corpus);
  const second = searchListings({ sort: 'newest', page: 2, perPage: 1 }, corpus);
  assert.equal(first.total, 3);
  assert.equal(first.totalPages, 3);
  assert.equal(first.hits[0]?.id, 'newest');
  assert.equal(second.hits[0]?.id, 'middle');
});

test('dashboard save status transitions keep published listings live and drafts private', () => {
  assert.equal(resolveListingStatus('publish'), 'published');
  assert.equal(resolveListingStatus('submit'), 'pending_review');
  assert.equal(resolveListingStatus('draft'), 'draft');
  assert.equal(listingPatchSchema.parse({ listing: { name: 'Example listing', typeSlug: 'business' } }).action, 'save');
  assert.equal(resolveListingStatus('save', { listingId: 'existing', currentStatus: 'published' }), 'published');
  assert.equal(resolveListingStatus('submit', { listingId: 'existing', currentStatus: 'published' }), 'published');
  assert.equal(resolveListingStatus('save', { listingId: 'existing', currentStatus: 'draft' }), 'draft');
  assert.equal(resolveListingStatus('submit', { listingId: 'existing', currentStatus: 'draft' }), 'pending_review');
});

test('public listing hydration canonicalizes known legacy taxonomy and preserves custom values', () => {
  const row = {
    id: 'row-id', slug: 'legacy-provider', name: 'Legacy Provider', typeSlug: 'business',
    industrySlug: 'home-services', categorySlug: 'pest-control',
    customProfessions: ['Wildlife Consultant'], denominationsList: [],
    showAddress: true, showPhone: false, showEmail: false, showWebsite: false, showDenomination: true,
    isOnlineOnly: false, isClaimed: false, reviewCount: 0, recommendationCount: 0, viewCount: 0,
    languages: ['English'], accessibility: [],
  };
  const mapped = mapListingRow(row, { city: 'Raleigh', region: 'NC', postalCode: '27601', latitude: null, longitude: null }, [], [], {
    professions: ['pest-control'], services: ['Bat exclusion'], industries: ['home-services', 'retail'],
  });
  assert.equal(mapped.industrySlug, 'home-property-services');
  assert.ok(mapped.industries.includes('home-property-services'));
  assert.ok(mapped.industries.includes('retail-consumer'));
  assert.ok(mapped.professions.includes('pest-control-specialist'));
  assert.ok(mapped.professions.includes('Wildlife Consultant'));
  assert.deepEqual(mapped.services, ['Bat exclusion']);
  assert.equal(mapped.postalCode, '27601');
  const preserved = rowToFormValues(row, undefined, { industries: [], professions: [], services: [] });
  assert.deepEqual(preserved.industries, [], 'an explicitly empty relation set must not fall back to the primary industry');
});

test('listing write schema accepts canonical/custom taxonomy and rejects broken hierarchy', () => {
  const base = { name: 'Taxonomy Example', typeSlug: 'business', industrySlug: 'home-property-services', categorySlug: 'pest-control', professions: ['pest-control'], customProfessions: ['Wildlife consultant'], services: ['Termite treatment', 'Emergency wildlife exclusion'] };
  assert.equal(listingInputSchema.safeParse(base).success, true);
  assert.equal(listingInputSchema.safeParse({ ...base, industrySlug: 'food-beverage' }).success, false);
  assert.equal(listingInputSchema.safeParse({ ...base, professions: ['attorney'] }).success, false);
  assert.equal(listingInputSchema.safeParse({ ...base, industries: ['not-a-canonical-industry'] }).success, false);
  assert.equal(listingInputSchema.safeParse({ name: 'Custom', typeSlug: 'business', services: ['A custom service'] }).success, false);
});


test('local taxonomy recommendations rank real work and return only validated catalog paths', () => {
  const recommendations = recommendTaxonomy({
    listingName: 'Raleigh Home Care',
    title: 'Pest management for homes',
    description: 'We provide termite treatment, rodent control, and humane wildlife exclusion for homeowners.',
    services: ['Termite treatment', 'Rodent control'],
  });
  assert.ok(recommendations.length <= 3);
  assert.equal(recommendations[0]?.professionSlug, 'pest-control-specialist');
  for (const item of recommendations) {
    const category = categoryBySlug(item.categorySlug);
    assert.ok(category, `unknown category ${item.categorySlug}`);
    assert.equal(category.industry.slug, item.industrySlug);
    assert.ok(category.category.professions.some((profession) => profession.slug === item.professionSlug));
    assert.ok(item.confidence >= 0 && item.confidence <= 0.98);
    assert.ok(['Strong match', 'Good match', 'Possible match'].includes(item.confidenceLabel));
    assert.ok(item.reason.length > 10);
    assert.ok(item.serviceNames.every((name) => professionBySlug(item.professionSlug)?.services.includes(name)));
  }
});

test('recommendation normalization handles accents, abbreviations, informal terms, and fuzzy matching', () => {
  assert.equal(normalizeRecommendationText('Café & IT support'), 'cafe and information technology support');
  assert.ok(tokenizeTaxonomyText('HVAC repair').includes('heating'));
  assert.ok(extractTaxonomyKeywords('bugs and taxes').includes('debugging'));
  assert.ok(extractTaxonomyKeywords('bugs and taxes').includes('preparation'));
  assert.ok(extractTaxonomyKeywords('exterminator').includes('termite'));
  const candidates = generateTaxonomyCandidates();
  const pest = candidates.find((candidate) => candidate.profession.slug === 'pest-control-specialist');
  assert.ok(pest);
  assert.ok(scoreTaxonomyCandidate(pest, { description: 'termite treatments and rodent control' }) > 0.5);
  assert.ok(scoreTaxonomyCandidate(pest, { listingName: 'pest control', description: 'termite treatment and rodent control' }) > scoreTaxonomyCandidate(pest, { listingName: 'termite treatment and rodent control', description: 'community outreach' }));
  assert.ok(calculateTaxonomyConfidence(0.8, 2) > calculateTaxonomyConfidence(0.8, 1));
});

test('new listing descriptions cap at 500 while dashboard patches preserve longer legacy text', () => {
  const base = { name: 'Description limit test', typeSlug: 'business' };
  assert.equal(listingInputSchema.safeParse({ ...base, description: 'x'.repeat(500) }).success, true);
  const tooLong = listingInputSchema.safeParse({ ...base, description: 'x'.repeat(501) });
  assert.equal(tooLong.success, false);
  assert.ok(tooLong.error.issues.some((issue) => issue.path.join('.') === 'description'));
  assert.equal(listingPatchSchema.safeParse({ listing: { ...base, description: 'x'.repeat(1200) } }).success, true);
});

test('empty optional recommendations never gate a valid manually selected listing', () => {
  assert.deepEqual(recommendTaxonomy({}), []);
  const manual = {
    name: 'Manual Pest Control', typeSlug: 'business',
    industrySlug: 'home-property-services', categorySlug: 'pest-control',
    professions: ['pest-control-specialist'], services: ['Termite treatment'],
  };
  const parsed = listingInputSchema.safeParse(manual);
  assert.equal(parsed.success, true);
  assert.deepEqual(parsed.data.professions, manual.professions);
  assert.deepEqual(parsed.data.services, manual.services);
});

test('weak or unknown listing terms receive a catalog-backed Other suggestion', () => {
  const recommendations = recommendTaxonomy({ listingName: 'Qzxvplm' });
  assert.ok(recommendations.length > 0);
  assert.equal(recommendations.at(-1)?.isFallback, true);
  const fallback = selectOtherFallback();
  assert.ok(fallback);
  assert.equal(categoryBySlug(fallback.categorySlug)?.industry.slug, fallback.industrySlug);
  assert.ok(professionBySlug(fallback.professionSlug));
  assert.deepEqual(recommendTaxonomy({}), []);
  assert.equal(recommendTaxonomy({ description: 'Our best local professional services' })[0]?.isFallback, true);
});


test('category typing does not trigger unrelated taxonomy suggestion updates', () => {
  const controller = readFileSync(new URL('../src/scripts/taxonomyRecommendationController.ts', import.meta.url), 'utf8');
  assert.match(controller, /if \(!isTaxonomyRecommendationField\(target\.name\)\) return;/);
  assert.match(controller, /form\.addEventListener\('input', handleRecommendationInput\)/);
  assert.match(controller, /form\.addEventListener\('change', handleRecommendationInput\)/);
  assert.match(controller, /Keep the current result block in place during debounce/);
  for (const field of ['customCategory', 'industrySlug', 'categorySlug', '']) {
    assert.equal(isTaxonomyRecommendationField(field), false, `${field || 'unnamed search'} should not refresh suggestions`);
  }
  for (const field of ['name', 'tagline', 'description', 'professions', 'services', 'customProfessions', 'customServices', 'hashtags']) {
    assert.equal(isTaxonomyRecommendationField(field), true, `${field} contributes to suggestions`);
  }
});

test('type-filtered recommendation fallback stays inside the allowed taxonomy catalog', () => {
  const religious = industryBySlug('religious-organizations');
  assert.ok(religious);
  const allowed = [{ ...religious, categories: religious.categories.filter((category) => ['churches', 'ministry', 'other-religious'].includes(category.slug)) }];
  const recommendations = recommendTaxonomy({ listingName: 'Qzxvplm' }, 3, allowed);
  assert.ok(recommendations.length > 0);
  assert.ok(recommendations.every((item) => item.industrySlug === 'religious-organizations'));
  assert.ok(recommendations.every((item) => allowed[0].categories.some((category) => category.slug === item.categorySlug)));
  assert.equal(recommendations.at(-1)?.categorySlug, 'other-religious');
});
