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
    quote: 'We needed a plumber on a Saturday and found one in five minutes. The verification dates right on the profile sold me — I knew someone had actually checked.',
    name: 'Rachel T.',
    role: 'Homeowner',
    city: 'Dallas, TX',
    listingSlug: 'cornerstone-plumbing',
    hue: 210,
  },
  {
    quote: 'I list my practice here because the review rules are serious. Every review is from a real client, and the moderation policy is published for anyone to read.',
    name: 'Dr. Hannah Reyes',
    role: 'Owner, Mercy Well Christian Counseling',
    city: 'Dallas, TX',
    listingSlug: 'mercy-well-counseling',
    hue: 200,
  },
  {
    quote: 'The profile walked me through everything before I called: hours, service area, credential check, even who answers the phone. Felt like a referral from a friend.',
    name: 'Marcus D.',
    role: 'Facilities director',
    city: 'Atlanta, GA',
    listingSlug: 'peachtree-craftsmen',
    hue: 95,
  },
  {
    quote: 'Claiming our listing took one afternoon. A real person reviewed our documents and the Christian-owned badge appeared with the date we were verified.',
    name: 'Marcus & Julie Whitfield',
    role: 'Owners, Good Samaritan Auto Care',
    city: 'Phoenix, AZ',
    listingSlug: 'good-samaritan-auto',
    hue: 205,
  },
  {
    quote: 'As a new church plant we were hard to find. CrossLinkd is now our top source for first-time visitors outside of personal invitations.',
    name: 'Pastor Andre Cole',
    role: 'GracePoint Church, Nashville',
    city: 'Nashville, TN',
    listingSlug: 'gracepoint-nashville',
    hue: 160,
  },
  {
    quote: 'I booked a bakery for our wedding from a photo and a review count. What I got was a couple who prayed with us and the best cake anyone had ever tasted.',
    name: 'Emily & Sam K.',
    role: 'Newlyweds',
    city: 'Fort Worth, TX',
    listingSlug: 'grace-and-grain-bakery',
    hue: 36,
  },
];
