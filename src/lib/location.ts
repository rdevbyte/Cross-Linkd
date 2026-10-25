/**
 * Location normalization — state and city.
 * Ensures consistent storage, display, search and validation.
 */

// 50 states + DC + common territories
const STATE_NAME_TO_ABBR: Record<string, string> = {
  'alabama': 'AL',
  'alaska': 'AK',
  'arizona': 'AZ',
  'arkansas': 'AR',
  'california': 'CA',
  'colorado': 'CO',
  'connecticut': 'CT',
  'delaware': 'DE',
  'florida': 'FL',
  'georgia': 'GA',
  'hawaii': 'HI',
  'idaho': 'ID',
  'illinois': 'IL',
  'indiana': 'IN',
  'iowa': 'IA',
  'kansas': 'KS',
  'kentucky': 'KY',
  'louisiana': 'LA',
  'maine': 'ME',
  'maryland': 'MD',
  'massachusetts': 'MA',
  'michigan': 'MI',
  'minnesota': 'MN',
  'mississippi': 'MS',
  'missouri': 'MO',
  'montana': 'MT',
  'nebraska': 'NE',
  'nevada': 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  'ohio': 'OH',
  'oklahoma': 'OK',
  'oregon': 'OR',
  'pennsylvania': 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  'tennessee': 'TN',
  'texas': 'TX',
  'utah': 'UT',
  'vermont': 'VT',
  'virginia': 'VA',
  'washington': 'WA',
  'west virginia': 'WV',
  'wisconsin': 'WI',
  'wyoming': 'WY',
  'district of columbia': 'DC',
  'washington dc': 'DC',
  'washington d.c.': 'DC',
  'dc': 'DC',
  'puerto rico': 'PR',
  'guam': 'GU',
  'virgin islands': 'VI',
  'american samoa': 'AS',
  'northern mariana islands': 'MP',
};

// Build abbreviation set from values
const VALID_ABBRS = new Set(Object.values(STATE_NAME_TO_ABBR));

// Explicit list for UI dropdown
export const US_STATES: { abbr: string; name: string }[] = [
  { abbr: 'AL', name: 'Alabama' },
  { abbr: 'AK', name: 'Alaska' },
  { abbr: 'AZ', name: 'Arizona' },
  { abbr: 'AR', name: 'Arkansas' },
  { abbr: 'CA', name: 'California' },
  { abbr: 'CO', name: 'Colorado' },
  { abbr: 'CT', name: 'Connecticut' },
  { abbr: 'DE', name: 'Delaware' },
  { abbr: 'FL', name: 'Florida' },
  { abbr: 'GA', name: 'Georgia' },
  { abbr: 'HI', name: 'Hawaii' },
  { abbr: 'ID', name: 'Idaho' },
  { abbr: 'IL', name: 'Illinois' },
  { abbr: 'IN', name: 'Indiana' },
  { abbr: 'IA', name: 'Iowa' },
  { abbr: 'KS', name: 'Kansas' },
  { abbr: 'KY', name: 'Kentucky' },
  { abbr: 'LA', name: 'Louisiana' },
  { abbr: 'ME', name: 'Maine' },
  { abbr: 'MD', name: 'Maryland' },
  { abbr: 'MA', name: 'Massachusetts' },
  { abbr: 'MI', name: 'Michigan' },
  { abbr: 'MN', name: 'Minnesota' },
  { abbr: 'MS', name: 'Mississippi' },
  { abbr: 'MO', name: 'Missouri' },
  { abbr: 'MT', name: 'Montana' },
  { abbr: 'NE', name: 'Nebraska' },
  { abbr: 'NV', name: 'Nevada' },
  { abbr: 'NH', name: 'New Hampshire' },
  { abbr: 'NJ', name: 'New Jersey' },
  { abbr: 'NM', name: 'New Mexico' },
  { abbr: 'NY', name: 'New York' },
  { abbr: 'NC', name: 'North Carolina' },
  { abbr: 'ND', name: 'North Dakota' },
  { abbr: 'OH', name: 'Ohio' },
  { abbr: 'OK', name: 'Oklahoma' },
  { abbr: 'OR', name: 'Oregon' },
  { abbr: 'PA', name: 'Pennsylvania' },
  { abbr: 'RI', name: 'Rhode Island' },
  { abbr: 'SC', name: 'South Carolina' },
  { abbr: 'SD', name: 'South Dakota' },
  { abbr: 'TN', name: 'Tennessee' },
  { abbr: 'TX', name: 'Texas' },
  { abbr: 'UT', name: 'Utah' },
  { abbr: 'VT', name: 'Vermont' },
  { abbr: 'VA', name: 'Virginia' },
  { abbr: 'WA', name: 'Washington' },
  { abbr: 'WV', name: 'West Virginia' },
  { abbr: 'WI', name: 'Wisconsin' },
  { abbr: 'WY', name: 'Wyoming' },
  { abbr: 'DC', name: 'District of Columbia' },
];

const DISPLAY_REGION_ABBRS = new Set(US_STATES.map(({ abbr }) => abbr));

function collapseSpaces(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

/**
 * Normalize state input to 2-letter abbreviation.
 * Returns abbreviation (e.g., "CA") or null if invalid.
 */
export function normalizeState(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = collapseSpaces(input);
  if (!raw) return null;
  const lower = raw.toLowerCase();

  // If 2 letters, check abbreviation
  if (/^[a-z]{2}$/i.test(raw)) {
    const upper = raw.toUpperCase();
    return VALID_ABBRS.has(upper) ? upper : null;
  }

  // Full name lookup (case-insensitive, collapsed spaces)
  if (STATE_NAME_TO_ABBR[lower]) {
    return STATE_NAME_TO_ABBR[lower];
  }

  // Also handle abbreviation with period? e.g., "CA." -> "CA"
  const stripped = raw.replace(/\./g, '').toUpperCase();
  if (stripped.length === 2 && VALID_ABBRS.has(stripped)) return stripped;

  return null;
}

export function isValidState(input: string | null | undefined): boolean {
  return normalizeState(input) !== null;
}

/** Display recognized U.S. state names/codes consistently as two-letter abbreviations. */
export function formatRegionForDisplay(input: string | null | undefined): string {
  const raw = input?.trim() ?? '';
  const normalized = normalizeState(raw);
  return normalized && DISPLAY_REGION_ABBRS.has(normalized) ? normalized : raw;
}

export function stateErrorMessage(): string {
  return 'Invalid state. Use a U.S. state name or 2-letter abbreviation (e.g., CA, NY, TX).';
}

// ---------------- City normalization ----------------

function processCoreToken(token: string, isSingleLetterPrefix: boolean): string {
  if (!token) return token;
  const lower = token.toLowerCase();

  // Common abbreviations
  if (lower === 'st' || lower === 'st.') return 'St.';
  if (lower === 'ste' || lower === 'ste.') return 'Ste.';
  if (lower === 'mt' || lower === 'mt.') return 'Mt.';
  if (lower === 'ft' || lower === 'ft.') return 'Ft.';

  // Mc handling: McAllen, McKinney, etc.
  if (lower.startsWith('mc') && lower.length > 2) {
    const rest = lower.slice(2);
    // Avoid false positives like "mcdonald" is still McDonald which is correct
    return 'Mc' + rest.charAt(0).toUpperCase() + rest.slice(1).toLowerCase();
  }

  // Mac handling: MacDonald etc - only apply for names where second part is capitalized and length reasonable
  // To avoid turning "machine" into "MacHine", only apply if original token length < 12 and not a common word
  if (lower.startsWith('mac') && lower.length > 3 && lower.length <= 12) {
    // simple heuristic: if after "mac" the next char is a consonant and rest is alphabetic
    const rest = lower.slice(3);
    if (/^[a-z]+$/.test(rest) && !['hinery', 'hine'].includes(rest)) {
      // Check against common words that shouldn't be Mac-ified
      const common = new Set(['machine', 'magazine', 'macro']);
      if (!common.has(lower)) {
        return 'Mac' + rest.charAt(0).toUpperCase() + rest.slice(1).toLowerCase();
      }
    }
  }

  if (isSingleLetterPrefix) {
    return token.charAt(0).toUpperCase();
  }

  return lower.charAt(0).toUpperCase() + lower.slice(1).toLowerCase();
}

function processHyphenPart(part: string): string {
  // Handle apostrophes: both straight ' and curly ’
  const hasApostrophe = /['’]/.test(part);
  if (hasApostrophe) {
    const segments = part.split(/['’]/);
    const seps = part.match(/['’]/g) || [];
    let result = '';
    for (let i = 0; i < segments.length; i++) {
      if (i > 0) {
        // Preserve apostrophe as straight '
        result += "'";
      }
      const seg = segments[i];
      const isPrefix = i === 0 && seg.length === 1;
      result += processCoreToken(seg, isPrefix);
    }
    return result;
  }
  return processCoreToken(part, false);
}

function processWord(word: string): string {
  // Handle hyphenated words: Winston-Salem, etc.
  return word.split('-').map(processHyphenPart).join('-');
}

/**
 * Normalize city name to proper case.
 * - Trims, collapses multiple spaces
 * - Title cases each word, preserving hyphen and apostrophe structures
 * - Handles McAllen, St. Louis, O'Fallon etc.
 */
export function normalizeCity(input: string | null | undefined): string {
  if (input == null) return '';
  let s = input.trim();
  if (!s) return '';
  // Normalize curly quotes to straight for consistent splitting, but processWord will handle both
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ');
  // Split by space and process each word
  const words = s.split(' ');
  const processed = words.map(processWord).join(' ');
  return processed;
}

export function isValidCity(input: string | null | undefined): boolean {
  if (!input) return false;
  const t = input.trim();
  return t.length >= 2 && t.length <= 120;
}
