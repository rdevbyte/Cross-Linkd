const US_STATE_NAMES = Object.freeze({
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
});
const STATE_CODES = new Set(Object.keys(US_STATE_NAMES));
const STATE_NAME_TO_CODE = new Map(Object.entries(US_STATE_NAMES).map(([code, name]) => [name.toLowerCase(), code]));

/** @typedef {{ city?: string | null, region?: string | null, isOnlineOnly?: boolean, addedDaysAgo?: number }} MetricListing */

/** @param {number} count @param {string} singular @param {string} plural */
export function metricNoun(count, singular, plural) {
  return count === 1 ? singular : plural;
}

/** @param {number} count @param {string} singular @param {string} plural */
export function formatMetricCount(count, singular, plural) {
  return `${count.toLocaleString()} ${metricNoun(count, singular, plural)}`;
}

/** @param {string | null | undefined} region */
function normalizedState(region) {
  const value = String(region ?? '').trim();
  if (!value) return undefined;
  const upper = value.toUpperCase();
  if (STATE_CODES.has(upper)) return upper;
  return STATE_NAME_TO_CODE.get(value.toLowerCase());
}

/** @param {string | null | undefined} city */
function normalizedCity(city) {
  const value = String(city ?? '').trim().replace(/\s+/g, ' ');
  if (!value || value === '—' || value === '-') return undefined;
  return value;
}

/**
 * Metrics calculated from the database-published listing set (not optional sample content).
 * @param {MetricListing[]} listings Published, non-deleted database listings only.
 * @param {number} [recentDays]
 */
export function calculateHomepageMetrics(listings, recentDays = 30) {
  const items = Array.isArray(listings) ? listings : [];
  const windowDays = Number.isFinite(recentDays) ? Math.max(0, recentDays) : 30;
  /** @type {Map<string, { state: string, listingCount: number }>} */
  const stateCounts = new Map();
  /** @type {Map<string, { city: string, state: string, listingCount: number }>} */
  const cityCounts = new Map();
  let recentlyAdded = 0;

  for (const listing of items) {
    const age = typeof listing.addedDaysAgo === 'number' ? listing.addedDaysAgo : Number.NaN;
    if (Number.isFinite(age) && age >= 0 && age <= windowDays) recentlyAdded++;

    if (listing.isOnlineOnly) continue;
    const state = normalizedState(listing.region);
    if (!state) continue;

    const stateCount = stateCounts.get(state) ?? { state, listingCount: 0 };
    stateCount.listingCount++;
    stateCounts.set(state, stateCount);

    const city = normalizedCity(listing.city);
    if (!city) continue;
    const cityKey = `${state}:${city.toLowerCase()}`;
    const cityCount = cityCounts.get(cityKey) ?? { city, state, listingCount: 0 };
    cityCount.listingCount++;
    cityCounts.set(cityKey, cityCount);
  }

  const topState = [...stateCounts.values()].sort((a, b) =>
    b.listingCount - a.listingCount || a.state.localeCompare(b.state),
  )[0];
  // Pair the leading city with the leading state so both location counts refer to one hierarchy.
  const topCity = topState
    ? [...cityCounts.values()]
      .filter((city) => city.state === topState.state)
      .sort((a, b) => b.listingCount - a.listingCount || a.city.localeCompare(b.city))[0]
    : undefined;

  return {
    activeListings: items.length,
    recentlyAdded,
    statesRepresented: stateCounts.size,
    citiesRepresented: cityCounts.size,
    topState: topState ? { ...topState, name: US_STATE_NAMES[topState.state] } : undefined,
    topCity: topCity ? { ...topCity, stateName: US_STATE_NAMES[topCity.state] } : undefined,
  };
}
