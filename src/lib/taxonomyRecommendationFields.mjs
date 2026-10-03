const RECOMMENDATION_FIELDS = new Set([
  'name',
  'tagline',
  'description',
  'professions',
  'services',
  'customProfessions',
  'customServices',
  'keywords',
  'hashtags',
]);

/** True only for fields consumed by the optional taxonomy recommender. */
export function isTaxonomyRecommendationField(name) {
  return typeof name === 'string' && RECOMMENDATION_FIELDS.has(name);
}
