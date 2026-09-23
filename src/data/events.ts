export interface SampleEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  format: 'in_person' | 'online' | 'hybrid';
  venue?: string;
  city: string;
  region: string;
  startsInDays: number;
  cost: string;
  ageGroup: string;
  organizer: string;
  organizerSlug?: string;
  hue: number;
}

export const SAMPLE_EVENTS: SampleEvent[] = [
  { id: 'e1', slug: 'night-of-worship-dallas', title: 'Night of Worship & Prayer', description: 'An evening of worship, Scripture, and guided prayer hosted by five Dallas churches. Free admission — love offering supports the Manna House Food Ministry.', category: 'Worship', format: 'in_person', venue: 'New Life Fellowship', city: 'Dallas', region: 'TX', startsInDays: 9, cost: 'Free', ageGroup: 'All ages', organizer: 'New Life Fellowship', organizerSlug: 'new-life-fellowship-dallas', hue: 265 },
  { id: 'e2', slug: 'faith-and-work-breakfast', title: 'Faith & Work Leaders Breakfast', description: 'Monthly networking breakfast for Christian founders, executives, and young professionals. Speaker: Miriam Chen on stewarding influence in the marketplace.', category: 'Networking', format: 'in_person', venue: 'Grace & Grain Bakery Loft', city: 'Dallas', region: 'TX', startsInDays: 4, cost: '$25', ageGroup: 'Adults', organizer: 'City on a Hill Podcast', hue: 36 },
  { id: 'e3', slug: 'marriage-enrichment-weekend', title: 'Marriage Enrichment Weekend', description: 'Two-day retreat with Dr. Hannah Reyes: communication, conflict repair, and praying together. Includes materials, meals, and childcare.', category: 'Retreat', format: 'in_person', venue: 'Mercy Well Counseling Retreat Room', city: 'Dallas', region: 'TX', startsInDays: 23, cost: '$149/couple', ageGroup: 'Married couples', organizer: 'Mercy Well Christian Counseling', organizerSlug: 'mercy-well-counseling', hue: 200 },
  { id: 'e4', slug: 'easter-choir-festival-online', title: 'Easter Choir Festival (Online)', description: 'Twelve choirs across six traditions premiere Easter anthems, with a combined virtual Hallelujah Chorus finale. Watch party kits available.', category: 'Concert', format: 'online', city: 'Online', region: '', startsInDays: 16, cost: 'Free', ageGroup: 'All ages', organizer: 'Living Waters Worship Collective', organizerSlug: 'living-waters-worship', hue: 180 },
  { id: 'e5', slug: 'serve-saturday-food-drive', title: 'Serve Saturday: Community Food Drive', description: 'Pack 1,000 grocery boxes in one morning. Family-friendly shifts, youth service hours available, lunch provided for volunteers.', category: 'Volunteer', format: 'in_person', venue: 'Manna House Warehouse', city: 'Atlanta', region: 'GA', startsInDays: 6, cost: 'Free', ageGroup: 'Ages 8+', organizer: 'Manna House Food Ministry', organizerSlug: 'manna-food-ministry', hue: 120 },
  { id: 'e6', slug: 'women-of-grace-conference', title: 'Women of Grace Conference', description: 'A one-day conference with worship, three keynote sessions, and 12 breakout workshops on faith, family, and calling.', category: 'Conference', format: 'hybrid', venue: 'St. Brigid Parish Center', city: 'Atlanta', region: 'GA', startsInDays: 37, cost: '$79', ageGroup: 'Women 16+', organizer: 'St. Brigid Catholic Church', organizerSlug: 'st-brigid-catholic', hue: 300 },
];

export const eventDate = (startsInDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + startsInDays);
  d.setHours(18, 30, 0, 0);
  return d;
};
export const eventBySlug = (slug: string) => SAMPLE_EVENTS.find((e) => e.slug === slug);
