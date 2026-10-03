import {
  INDUSTRIES,
  type Industry,
  type Category,
  type Profession,
} from '@/data/industries';

export type RecommendationConfidence = 'Strong match' | 'Good match' | 'Possible match';

export interface TaxonomyRecommendationInput {
  listingName?: string;
  title?: string;
  description?: string;
  services?: string | string[];
  profession?: string | string[];
  keywords?: string | string[];
  /** Use only text already extracted and permitted by the app. URLs are never fetched here. */
  websiteText?: string;
}

export interface TaxonomyRecommendation {
  industrySlug: string;
  categorySlug: string;
  professionSlug: string;
  /** Existing service-example names from this profession; this taxonomy has no service slugs. */
  serviceNames: string[];
  confidence: number;
  confidenceLabel: RecommendationConfidence;
  reason: string;
  isFallback?: boolean;
}

export interface TaxonomyCandidate {
  industry: Industry;
  category: Category;
  profession: Profession;
  industrySlug: string;
  categorySlug: string;
  professionSlug: string;
}

interface TextSource { field: keyof TaxonomyRecommendationInput; text: string; weight: number; label: string }
interface CandidateScore { recommendation: TaxonomyRecommendation; score: number; serviceScores: Array<{ name: string; score: number }> }

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'at', 'by', 'for', 'from', 'in', 'into', 'is', 'it', 'of', 'on', 'or',
  'the', 'to', 'with', 'your', 'our', 'we', 'you', 'they', 'that', 'this', 'be', 'as', 'will', 'can',
  'best', 'trusted', 'quality', 'professional', 'professionals', 'business', 'businesses', 'company',
  'companies', 'services', 'service', 'solutions', 'christian', 'faith', 'based', 'local', 'leading',
  'premier', 'experienced', 'affordable', 'helping', 'dedicated', 'committed', 'family', 'owned',
]);

const ABBREVIATIONS: Record<string, string> = {
  'p r': 'public relations', pr: 'public relations', marcom: 'marketing communications',
  seo: 'search engine optimization', sem: 'search engine marketing', ppc: 'pay per click',
  cpa: 'certified public accountant', hvac: 'heating ventilation air conditioning',
  ux: 'user experience', ui: 'user interface', av: 'audio visual', cnc: 'computer numerical control',
  pi: 'private investigator', msp: 'managed service provider',
};

const INFORMAL_TERMS: Record<string, string[]> = {
  web: ['website', 'web development', 'web design'],
  website: ['web development', 'web design', 'site building'],
  websites: ['web development', 'web design'],
  bugs: ['software debugging', 'software development', 'computer support'],
  bug: ['software debugging', 'software development'],
  taxes: ['tax preparation', 'accounting', 'bookkeeping'],
  tax: ['tax preparation', 'accounting'],
  books: ['bookkeeping', 'accounting'],
  flowers: ['floral design', 'florist', 'bouquets'],
  flowershop: ['floral design', 'florist'],
  yard: ['lawn care', 'landscaping', 'gardening'],
  lawn: ['lawn care', 'landscaping'],
  bugspray: ['pest control', 'extermination'],
  exterminator: ['pest control', 'termite treatment'],
  shrink: ['psychologist', 'mental health', 'therapy'],
  counselor: ['counseling', 'therapy', 'mental health'],
  lawyer: ['attorney', 'legal services', 'law firm'],
  mechanic: ['automotive repair', 'auto service'],
  car: ['automotive', 'auto repair'],
  moving: ['moving company', 'relocation', 'transportation'],
  movers: ['moving company', 'relocation'],
  clean: ['cleaning', 'janitorial', 'housekeeping'],
  cleaner: ['cleaning', 'janitorial', 'housekeeping'],
  wedding: ['event planning', 'venue', 'catering'],
  party: ['event planning', 'party rental', 'entertainment'],
  preach: ['pastor', 'ministry', 'church'],
  pastor: ['pastoral care', 'church', 'ministry'],
};

const FIELD_WEIGHTS: Record<keyof TaxonomyRecommendationInput, number> = {
  listingName: 0.85,
  title: 2.15,
  description: 3.6,
  services: 4.5,
  profession: 4.1,
  keywords: 3.25,
  websiteText: 0.8,
};
const FIELD_LABELS: Record<keyof TaxonomyRecommendationInput, string> = {
  listingName: 'business name', title: 'listing title', description: 'description', services: 'services',
  profession: 'profession', keywords: 'keywords', websiteText: 'website text',
};

const normalizedCache = new Map<string, string>();
const tokenCache = new Map<string, string[]>();
const keywordCache = new Map<string, string[]>();
const phraseCache = new Map<string, number>();

function cacheSet<K, V>(cache: Map<K, V>, key: K, value: V, maxEntries: number): void {
  if (!cache.has(key) && cache.size >= maxEntries) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

/** Unicode/punctuation normalization plus common industry abbreviations. */
export function normalizeRecommendationText(value: string): string {
  const cached = normalizedCache.get(value);
  if (cached !== undefined) return cached;
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/&/g, ' and ')
    .replace(/\bIT\b/g, 'information technology')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  if (!normalized) { cacheSet(normalizedCache, value, '', 6000); return ''; }
  const parts = normalized.split(' ').flatMap((part) => (ABBREVIATIONS[part] ?? part).split(' '));
  const result = parts.join(' ').replace(/\s+/g, ' ').trim();
  cacheSet(normalizedCache, value, result, 6000);
  return result;
}

/** Tokenization is shared by matching, explanation generation, and confidence calculation. */
export function tokenizeTaxonomyText(value: string): string[] {
  const cached = tokenCache.get(value);
  if (cached) return cached;
  const result = normalizeRecommendationText(value)
    .split(' ')
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
  cacheSet(tokenCache, value, result, 6000);
  return result;
}

export function extractTaxonomyKeywords(value: string): string[] {
  const cached = keywordCache.get(value);
  if (cached) return cached;
  const tokens = tokenizeTaxonomyText(value);
  const expanded = new Set(tokens);
  for (const token of tokens) {
    for (const phrase of INFORMAL_TERMS[token] ?? []) {
      tokenizeTaxonomyText(phrase).forEach((expandedToken) => expanded.add(expandedToken));
    }
  }
  const result = [...expanded];
  cacheSet(keywordCache, value, result, 6000);
  return result;
}

function asList(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  if (!value) return [];
  return value.split(/[\n,;|]+/).map((item) => item.trim()).filter(Boolean);
}

function textSources(input: TaxonomyRecommendationInput): TextSource[] {
  const raw: Array<[keyof TaxonomyRecommendationInput, string]> = [
    ['listingName', input.listingName ?? ''], ['title', input.title ?? ''], ['description', input.description ?? ''],
    ['services', asList(input.services).join(' ')], ['profession', asList(input.profession).join(' ')],
    ['keywords', asList(input.keywords).join(' ')], ['websiteText', input.websiteText ?? ''],
  ];
  return raw.flatMap(([field, text]) => text.trim() ? [{ field, text, weight: FIELD_WEIGHTS[field], label: FIELD_LABELS[field] }] : []);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row++) {
    const current = [row];
    for (let column = 1; column <= b.length; column++) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

function tokenSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 4 || b.length < 4) return 0;
  const distance = levenshtein(a, b);
  const threshold = Math.max(1, Math.floor(Math.max(a.length, b.length) * 0.24));
  return distance <= threshold ? 1 - distance / Math.max(a.length, b.length) : 0;
}

function phraseMatch(query: string, term: string): number {
  const normalizedQuery = normalizeRecommendationText(query);
  const normalizedTerm = normalizeRecommendationText(term);
  const cacheKey = `${normalizedQuery}\u0000${normalizedTerm}`;
  const cached = phraseCache.get(cacheKey);
  if (cached !== undefined) return cached;
  let result = 0;
  if (!normalizedQuery || !normalizedTerm) result = 0;
  else if (normalizedQuery === normalizedTerm || normalizedQuery.includes(` ${normalizedTerm} `) || normalizedQuery.startsWith(`${normalizedTerm} `) || normalizedQuery.endsWith(` ${normalizedTerm}`)) {
    result = tokenizeTaxonomyText(normalizedTerm).length > 1 ? 1 : 0.86;
  } else {
    const queryTokens = extractTaxonomyKeywords(normalizedQuery);
    const termTokens = extractTaxonomyKeywords(normalizedTerm);
    if (queryTokens.length && termTokens.length) {
      let matches = 0;
      for (const target of termTokens) {
        const best = Math.max(0, ...queryTokens.map((queryToken) => tokenSimilarity(queryToken, target)));
        if (best >= 0.72) matches += best;
      }
      const coverage = matches / termTokens.length;
      const queryCoverage = Math.min(1, matches / Math.max(1, Math.min(queryTokens.length, 4)));
      const overlapScore = coverage * 0.68 + queryCoverage * 0.32;
      result = overlapScore >= 0.34 ? Math.min(0.82, overlapScore) : 0;
    }
  }
  cacheSet(phraseCache, cacheKey, result, 24000);
  return result;
}

function matchTextToTerms(text: string, terms: string[]): { score: number; term?: string } {
  let score = 0;
  let matchedTerm: string | undefined;
  for (const term of terms) {
    const current = phraseMatch(text, term);
    if (current > score) { score = current; matchedTerm = term; }
  }
  return { score, term: matchedTerm };
}

/** Generate one candidate for each existing Industry → Category → Profession path. */
export function generateTaxonomyCandidates(taxonomy: Industry[] = INDUSTRIES): TaxonomyCandidate[] {
  return taxonomy.flatMap((industry) => industry.categories.flatMap((category) => category.professions.map((profession) => ({
    industry, category, profession,
    industrySlug: industry.slug,
    categorySlug: category.slug,
    professionSlug: profession.slug,
  }))));
}

function nodeTerms(node: { name: string; slug: string; aliases?: string[]; keywords?: string[] }): string[] {
  return [...new Set([node.name, node.slug.replace(/-/g, ' '), ...(node.aliases ?? []), ...(node.keywords ?? [])])];
}

function candidateTextScore(text: string, candidate: TaxonomyCandidate) {
  const industry = matchTextToTerms(text, nodeTerms(candidate.industry));
  const category = matchTextToTerms(text, nodeTerms(candidate.category));
  const profession = matchTextToTerms(text, nodeTerms(candidate.profession));
  const service = matchTextToTerms(text, candidate.profession.services ?? []);
  const professionSignal = Math.max(profession.score, service.score);
  const hierarchySignal = Math.max(category.score * 0.82, industry.score * 0.62);
  return {
    score: Math.min(1, professionSignal + hierarchySignal * 0.22),
    bestTerm: profession.score >= service.score ? profession.term : service.term,
    serviceScore: service.score,
    professionScore: profession.score,
    categoryScore: category.score,
    industryScore: industry.score,
  };
}

/** Score a taxonomy path against listing text using field-specific, work-focused weights. */
function scoreCandidateFromSources(candidate: TaxonomyCandidate, sources: TextSource[]): number {
  if (!sources.length) return 0;
  const denominator = sources.reduce((sum, source) => sum + source.weight, 0);
  const weighted = sources.reduce((sum, source) => sum + source.weight * candidateTextScore(source.text, candidate).score, 0);
  return denominator ? weighted / denominator : 0;
}

export function scoreTaxonomyCandidate(candidate: TaxonomyCandidate, input: TaxonomyRecommendationInput): number {
  return scoreCandidateFromSources(candidate, textSources(input));
}

export function calculateTaxonomyConfidence(score: number, matchedWeight = 1): number {
  const bounded = Math.max(0, Math.min(1, score));
  const coverageBonus = Math.min(0.12, Math.max(0, matchedWeight - 1) * 0.025);
  return Math.max(0, Math.min(0.98, bounded * 0.84 + coverageBonus));
}

function confidenceLabel(confidence: number): RecommendationConfidence {
  if (confidence >= 0.68) return 'Strong match';
  if (confidence >= 0.42) return 'Good match';
  return 'Possible match';
}

function reasonFor(candidate: TaxonomyCandidate, sources: TextSource[]): string {
  const matches = sources.map((source) => ({ source, ...candidateTextScore(source.text, candidate) }))
    .sort((a, b) => b.score * b.source.weight - a.score * a.source.weight);
  const strongest = matches.find((match) => match.score >= 0.22);
  const term = strongest?.bestTerm?.replace(/-/g, ' ');
  if (strongest && term) {
    const subject = strongest.source.field === 'services' ? 'The services you entered' : strongest.source.field === 'profession' ? 'Your profession selection' : `Your ${strongest.source.label}`;
    const verb = strongest.source.field === 'services' ? 'include' : 'mentions';
    return `${subject} ${verb} “${term},” which aligns with ${candidate.profession.name.toLowerCase()}.`;
  }
  if (strongest) return `Your ${strongest.source.label} aligns with ${candidate.category.name.toLowerCase()} and ${candidate.profession.name.toLowerCase()}.`;
  return `This path is a close fit for the work described in your listing.`;
}

function serviceRelevance(candidate: TaxonomyCandidate, sources: TextSource[]): Array<{ name: string; score: number }> {
  return (candidate.profession.services ?? []).map((name) => {
    const score = sources.reduce((best, source) => Math.max(best, phraseMatch(source.text, name)), 0);
    return { name, score };
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function scoreAndRank(candidate: TaxonomyCandidate, sources: TextSource[]): CandidateScore {
  const rawScore = scoreCandidateFromSources(candidate, sources);
  const sourcesWithMatches = sources.filter((source) => candidateTextScore(source.text, candidate).score >= 0.25);
  const matchedWeight = sourcesWithMatches.reduce((sum, source) => sum + source.weight, 0);
  const confidence = calculateTaxonomyConfidence(rawScore, matchedWeight);
  const serviceScores = serviceRelevance(candidate, sources);
  const matchedServices = serviceScores.filter((service) => service.score >= 0.28).slice(0, 3).map((service) => service.name);
  return {
    score: rawScore,
    serviceScores,
    recommendation: {
      industrySlug: candidate.industrySlug,
      categorySlug: candidate.categorySlug,
      professionSlug: candidate.professionSlug,
      serviceNames: matchedServices.length ? matchedServices : (candidate.profession.services ?? []).slice(0, 2),
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      reason: reasonFor(candidate, sources),
    },
  };
}

/** Pick a catalog-backed Other path; prefer a relevant industry's own Other category where available. */
export function selectOtherFallback(industrySlug?: string, taxonomy: Industry[] = INDUSTRIES): TaxonomyRecommendation | undefined {
  const preferred = taxonomy.find((industry) => industry.slug === industrySlug);
  const preferredCategory = preferred?.categories.find((category) => /^other\b/i.test(category.name) || category.slug.startsWith('other'));
  const universalIndustry = taxonomy.find((industry) => industry.slug === 'other-industries')
    ?? taxonomy.find((industry) => industry.categories.some((category) => /^other\b/i.test(category.name) || category.slug.startsWith('other')));
  const universalCategory = universalIndustry?.categories.find((category) => category.name === 'Other Category')
    ?? universalIndustry?.categories.find((category) => /^other\b/i.test(category.name) || category.slug.startsWith('other'));
  const universalProfession = universalCategory?.professions.find((profession) => profession.name === 'Other Professional or Service Provider') ?? universalCategory?.professions[0];
  const category = preferredCategory?.professions[0] ? preferredCategory : universalCategory;
  const industry = preferredCategory?.professions[0] ? preferred! : universalIndustry;
  const profession = preferredCategory?.professions[0] ?? universalProfession;
  if (!industry || !category || !profession) return undefined;
  return {
    industrySlug: industry.slug,
    categorySlug: category.slug,
    professionSlug: profession.slug,
    serviceNames: [],
    confidence: 0.28,
    confidenceLabel: 'Possible match',
    reason: 'No clear close match yet. This Other option lets you add a custom profession and services.',
    isFallback: true,
  };
}

/** Rank catalog-backed local matches and add a useful Other option if evidence is weak. */
export function rankTaxonomyRecommendations(
  input: TaxonomyRecommendationInput,
  taxonomy: Industry[] = INDUSTRIES,
  limit = 3,
): TaxonomyRecommendation[] {
  const rawSources = textSources(input);
  const sources = rawSources.filter((source) => tokenizeTaxonomyText(source.text).length > 0);
  if (!rawSources.length) return [];
  if (!sources.length) {
    const fallback = selectOtherFallback(undefined, taxonomy);
    return fallback ? [fallback] : [];
  }
  const candidates = generateTaxonomyCandidates(taxonomy);
  const ranked = candidates.map((candidate) => scoreAndRank(candidate, sources))
    .filter((item) => item.score >= 0.12)
    .sort((a, b) => b.score - a.score || b.recommendation.confidence - a.recommendation.confidence || a.recommendation.professionSlug.localeCompare(b.recommendation.professionSlug));

  const distinct: CandidateScore[] = [];
  const seen = new Set<string>();
  for (const item of ranked) {
    const key = `${item.recommendation.industrySlug}/${item.recommendation.categorySlug}/${item.recommendation.professionSlug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    distinct.push(item);
    if (distinct.length >= limit) break;
  }

  const shouldShowFallback = distinct.length === 0 || distinct[0].recommendation.confidence < 0.42;
  if (shouldShowFallback) {
    const fallback = selectOtherFallback(distinct[0]?.recommendation.industrySlug, taxonomy);
    if (fallback && !seen.has(`${fallback.industrySlug}/${fallback.categorySlug}/${fallback.professionSlug}`)) {
      if (distinct.length >= limit) distinct.pop();
      distinct.push({ recommendation: fallback, score: 0.05, serviceScores: [] });
    }
  }
  return distinct.slice(0, limit).map((item) => item.recommendation);
}

export function recommendTaxonomy(input: TaxonomyRecommendationInput, limit = 3, taxonomy: Industry[] = INDUSTRIES): TaxonomyRecommendation[] {
  return rankTaxonomyRecommendations(input, taxonomy, Math.max(1, Math.min(3, limit)));
}
