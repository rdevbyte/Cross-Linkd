/** Exact public trust language. Do not paraphrase these strings in page copy. */

export const LONG_DISCLAIMER =
  'CrossLinkd is a community directory. Business owners submit information about their business and may identify it as Christian-owned. CrossLinkd reviews submissions for completeness and obvious inconsistencies but does not independently verify faith, ownership, licenses, certifications, credentials, or service quality. Please perform your own due diligence before hiring or supporting a listed organization.';

export const SHORT_DISCLAIMER =
  'Listing on CrossLinkd does not constitute an endorsement. Please independently evaluate each business, church, ministry, or organization before engaging with it.';

export const ATTESTATION =
  'I confirm that the information submitted is accurate to the best of my knowledge.';

export const LISTING_STATUSES: { name: string; definition: string }[] = [
  { name: 'Owner-submitted', definition: 'The business provided the listing information.' },
  { name: 'Owner claimed', definition: 'Someone demonstrated control of the listing or business contact channel.' },
  { name: 'Website confirmed', definition: 'The owner demonstrated control of the listed website or email address.' },
  { name: 'Recently confirmed by owner', definition: 'The owner recently reconfirmed that the profile information is current.' },
  { name: 'Community reported', definition: 'A user submitted feedback or reported a concern.' },
  { name: 'Needs update', definition: 'Some information may be outdated.' },
  { name: 'Inactive', definition: 'The listing is no longer actively maintained.' },
];

/** Directory presence. Not one of the seven maintenance statuses, and not a verification. */
export const COMMUNITY_LISTED = {
  name: 'Community-listed',
  definition: 'The listing is in the directory. That does not mean CrossLinkd investigated the organization.',
};

const US_REGIONS = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM',
  'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA',
  'WV', 'WI', 'WY',
]);

export function isUsRegion(region: string | undefined | null): boolean {
  if (!region) return false;
  return US_REGIONS.has(region.trim().toUpperCase());
}
