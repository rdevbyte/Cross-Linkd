/**
 * Testimonials — quotes from directory users and listed business owners.
 * Sample content for launch; replace with collected quotes as they come in.
 * Each quote links to a real listing page so readers can verify the source.
 */

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  city: string;
  listingSlug?: string;
  hue: number;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote: 'Sample quote only. Do not publish this as a real review. A directory profile is not a license check.',
    name: 'Rachel T.',
    role: 'Homeowner',
    city: 'Dallas, TX',
    listingSlug: 'cornerstone-plumbing',
    hue: 210,
  },
  {
    quote: 'Sample quote only. Do not publish this as a real owner statement or as proof that reviews were verified.',
    name: 'Dr. Hannah Reyes',
    role: 'Owner, Mercy Well Christian Counseling',
    city: 'Dallas, TX',
    listingSlug: 'mercy-well-counseling',
    hue: 200,
  },
  {
    quote: 'Sample quote only. Hours and service area on a profile are owner-submitted, not a credential check.',
    name: 'Marcus D.',
    role: 'Facilities director',
    city: 'Atlanta, GA',
    listingSlug: 'peachtree-craftsmen',
    hue: 95,
  },
  {
    quote: 'Sample quote only. Claiming a listing is not a Christian-owned verification and does not create a badge.',
    name: 'Marcus & Julie Whitfield',
    role: 'Owners, Good Samaritan Auto Care',
    city: 'Phoenix, AZ',
    listingSlug: 'good-samaritan-auto',
    hue: 205,
  },
  {
    quote: 'Sample quote only. Do not publish this as a real church result or as proof of visitor volume.',
    name: 'Pastor Andre Cole',
    role: 'GracePoint Church, Nashville',
    city: 'Nashville, TN',
    listingSlug: 'gracepoint-nashville',
    hue: 160,
  },
  {
    quote: 'Sample quote only. Do not publish this as a real review, rating, or endorsement.',
    name: 'Emily & Sam K.',
    role: 'Newlyweds',
    city: 'Fort Worth, TX',
    listingSlug: 'grace-and-grain-bakery',
    hue: 36,
  },
];
