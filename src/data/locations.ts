/**
 * Focus locations — CrossLinkd launches in selected metro areas only.
 * We add a city page once it has enough reviewed listings to be useful.
 * (No thin pages: every city listed here has real listings.)
 */

export interface FocusCity {
  slug: string;          // url slug: dallas-tx
  city: string;
  region: string;        // state abbr
  stateName: string;
  lat: number;
  lng: number;
  zips: string[];        // sample ZIPs for "City, state, or ZIP" search
  blurb: string;
}

export interface FocusState {
  abbr: string;
  name: string;
  slug: string;
}

export const FOCUS_STATES: FocusState[] = [
  { abbr: 'TX', name: 'Texas', slug: 'texas' },
  { abbr: 'TN', name: 'Tennessee', slug: 'tennessee' },
  { abbr: 'GA', name: 'Georgia', slug: 'georgia' },
  { abbr: 'AZ', name: 'Arizona', slug: 'arizona' },
  { abbr: 'CO', name: 'Colorado', slug: 'colorado' },
];

export const FOCUS_CITIES: FocusCity[] = [
  {
    slug: 'dallas-tx', city: 'Dallas', region: 'TX', stateName: 'Texas',
    lat: 32.7767, lng: -96.797,
    zips: ['75201', '75206', '75207', '75230', '75214'],
    blurb: 'Bakeries, trades, counselors, and churches across Dallas County.',
  },
  {
    slug: 'fort-worth-tx', city: 'Fort Worth', region: 'TX', stateName: 'Texas',
    lat: 32.7555, lng: -97.3308,
    zips: ['76102', '76107', '76110', '76116'],
    blurb: 'Attorneys, caterers, roofers, and more in Cowtown.',
  },
  {
    slug: 'nashville-tn', city: 'Nashville', region: 'TN', stateName: 'Tennessee',
    lat: 36.1627, lng: -86.7816,
    zips: ['37203', '37211', '37204', '37215'],
    blurb: 'Media, music, fitness, and financial pros in Music City.',
  },
  {
    slug: 'atlanta-ga', city: 'Atlanta', region: 'GA', stateName: 'Georgia',
    lat: 33.749, lng: -84.388,
    zips: ['30305', '30308', '30310', '30324'],
    blurb: 'Contractors, planners, insurance, and churches across Metro Atlanta.',
  },
  {
    slug: 'phoenix-az', city: 'Phoenix', region: 'AZ', stateName: 'Arizona',
    lat: 33.4484, lng: -112.074,
    zips: ['85004', '85008', '85016', '85020'],
    blurb: 'Realtors, mechanics, restaurants, and salons in the Valley.',
  },
  {
    slug: 'colorado-springs-co', city: 'Colorado Springs', region: 'CO', stateName: 'Colorado',
    lat: 38.8339, lng: -104.8214,
    zips: ['80903', '80906', '80909', '80918'],
    blurb: 'Schools, counseling, coffee, and bookshops at the foot of Pikes Peak.',
  },
];

export const stateBySlug = (slug: string) => FOCUS_STATES.find((s) => s.slug === slug);
export const cityBySlug = (slug: string) => FOCUS_CITIES.find((c) => c.slug === slug);

/**
 * Resolve free-text location input — "Dallas", "Dallas, TX", "Texas", "TX",
 * or a ZIP code — to a city (or state) filter. Returns null when the input
 * is outside our focus areas (the UI then explains where we do operate).
 */
export function resolveLocation(input: string | undefined | null): { city?: FocusCity; state?: FocusState } | null {
  if (!input) return null;
  const raw = input.trim().toLowerCase();
  if (!raw) return null;

  // ZIP code?
  const zip = raw.replace(/\D/g, '');
  if (zip.length === 5) {
    const city = FOCUS_CITIES.find((c) => c.zips.includes(zip));
    if (city) return { city };
    const state = FOCUS_STATES.find((s) => zip.startsWith(s.abbr === 'TX' ? '75' : s.abbr === 'TN' ? '37' : s.abbr === 'GA' ? '30' : s.abbr === 'AZ' ? '85' : '80'));
    return state ? { state } : null;
  }

  // "city, st" form?
  const [, , cityPart, statePart] = raw.match(/^([^,]+),\s*([a-z]{2})$/) ?? [, , raw, ''];
  const byCity = FOCUS_CITIES.find((c) =>
    c.city.toLowerCase() === (cityPart ?? raw) ||
    c.slug === (cityPart ?? raw).replace(/\s+/g, '-'),
  );
  if (byCity && (!statePart || byCity.region.toLowerCase() === statePart)) return { city: byCity };

  // State by name or abbreviation?
  const state = FOCUS_STATES.find((s) => s.name.toLowerCase() === raw || s.abbr.toLowerCase() === raw);
  if (state) return { state };

  return null;
}
