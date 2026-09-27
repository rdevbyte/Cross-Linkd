/** Listing-type taxonomy — each type can have its own profile template + fields. */
export interface ListingType {
  slug: string;
  label: string;
  plural: string;
  description: string;
  icon: string;
}

export const LISTING_TYPES: ListingType[] = [
  { slug: 'business', label: 'Business', plural: 'Businesses', description: 'Christian-owned companies, shops, and service providers.', icon: 'store' },
  { slug: 'church', label: 'Church', plural: 'Churches', description: 'Local congregations across every Christian tradition.', icon: 'church' },
  { slug: 'ministry', label: 'Ministry', plural: 'Ministries', description: 'Parachurch ministries, outreaches, and missions.', icon: 'hands' },
  { slug: 'nonprofit', label: 'Nonprofit', plural: 'Nonprofits', description: 'Faith-rooted charities and civic organizations.', icon: 'heart' },
  { slug: 'professional', label: 'Professional', plural: 'Professionals', description: 'Christian professionals for hire. Credentials are owner-submitted and not independently checked.', icon: 'briefcase' },
  { slug: 'school', label: 'School', plural: 'Schools', description: 'Christian schools, colleges, and training programs.', icon: 'cap' },
  { slug: 'event', label: 'Event', plural: 'Events', description: 'Conferences, concerts, retreats, and gatherings.', icon: 'calendar' },
  { slug: 'author', label: 'Author', plural: 'Authors', description: 'Christian writers and publishers.', icon: 'book' },
  { slug: 'speaker', label: 'Speaker', plural: 'Speakers', description: 'Speakers for churches, conferences, and retreats.', icon: 'mic' },
  { slug: 'worship-leader', label: 'Worship Leader', plural: 'Worship Leaders', description: 'Worship pastors, leaders, and teams.', icon: 'music' },
  { slug: 'musician', label: 'Musician', plural: 'Musicians', description: 'Christian artists, bands, and producers.', icon: 'guitar' },
  { slug: 'counselor', label: 'Counselor', plural: 'Counselors', description: 'Christian counselors and therapists.', icon: 'chat' },
  { slug: 'contractor', label: 'Contractor', plural: 'Contractors', description: 'Christian contractors and trades. A license, if listed, is owner-submitted.', icon: 'hammer' },
  { slug: 'organization', label: 'Organization', plural: 'Organizations', description: 'Associations, networks, and community groups.', icon: 'globe' },
  { slug: 'mission', label: 'Mission', plural: 'Missions', description: 'Mission agencies and sending organizations.', icon: 'send' },
  { slug: 'conference', label: 'Conference', plural: 'Conferences', description: 'Multi-day conferences and expos.', icon: 'users' },
  { slug: 'retreat', label: 'Retreat Center', plural: 'Retreat Centers', description: 'Retreat venues and spiritual formation centers.', icon: 'tent' },
  { slug: 'online-ministry', label: 'Online Ministry', plural: 'Online Ministries', description: 'Digital-first ministries, podcasts, and channels.', icon: 'signal' },
];

export const typeBySlug = (slug: string) =>
  LISTING_TYPES.find((t) => t.slug === slug) ?? LISTING_TYPES[0];
