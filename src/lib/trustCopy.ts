/** Canonical public trust language. Reuse these strings rather than inventing variants. */

export const LONG_DISCLAIMER =
  'Listings may be submitted by owners or community members. Details are not independently verified by CrossLinkd, and inclusion is not an endorsement. Please evaluate each listing independently before engaging with it.';

export const SHORT_DISCLAIMER =
  'Listings may be submitted by owners or community members. Details are not independently verified; inclusion is not an endorsement.';

export const REPORT_DISCLOSURE =
  'Use the contact form to flag inaccurate, outdated, spam, or inappropriate content for review. No response time or outcome is promised.';

export const ATTESTATION =
  'I confirm that the information submitted is accurate to the best of my knowledge.';

/** Submission-source labels are shown only when the source has been recorded. */
export const SUBMISSION_SOURCES = {
  owner: {
    name: 'Owner-submitted',
    definition: 'The business owner or an authorized representative says they submitted the listing. The source is self-reported; the details are not independently verified.',
  },
  community: {
    name: 'Community-submitted',
    definition: 'A community member submitted or shared the listing. The details are not independently verified.',
  },
} as const;

export const LISTING_STATUSES: { name: string; definition: string }[] = [
  SUBMISSION_SOURCES.owner,
  SUBMISSION_SOURCES.community,
  { name: 'Owner-managed', definition: 'The listing is connected to an account that can manage or update it. This does not verify legal ownership or profile details.' },
  { name: 'Community reported', definition: 'A user flagged content for review. A report does not confirm that the reported issue is accurate.' },
  { name: 'Needs update', definition: 'Information may be outdated; this label is not an independent check.' },
  { name: 'Inactive', definition: 'The listing is marked inactive. This is not a finding about the organization’s legitimacy or quality.' },
];

/** Directory presence, separate from both submission source and management access. */
export const COMMUNITY_LISTED = {
  name: 'Directory-listed',
  definition: 'The profile appears in the directory. Inclusion is not an endorsement or an independent verification.',
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
