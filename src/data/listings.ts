/**
 * Normalized listing view-model types used by database-backed pages and components.
 * No bundled sample listing records are shipped.
 */
export interface SampleReview {
  name: string;
  rating: number;
  title: string;
  body: string;
  daysAgo: number;
  verified: boolean;
  ownerResponse?: string;
}

export interface SamplePhoto {
  hue: number;
  caption: string;
  url?: string;
  alt?: string;
}

/** Legacy type name retained for the normalized listing shape used by the UI. */
export interface SampleListing {
  id: string;
  slug: string;
  name: string;
  typeSlug: string;
  tagline: string;
  description: string;
  city: string;
  region: string;
  postalCode?: string;
  country?: string;
  lat?: number;
  lng?: number;
  isOnlineOnly?: boolean;
  isHiring?: boolean;
  careersUrl?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  coverUrl?: string;
  showEmail?: boolean;
  showPhone?: boolean;
  showWebsite?: boolean;
  showAddress?: boolean;
  showDenomination?: boolean;
  customDenomination?: string;
  industrySlug?: string;
  categorySlug?: string;
  customCategory?: string;
  priceRange?: string;
  industries: string[];
  professions: string[];
  denominations: string[];
  hashtags: string[];
  services: string[];
  languages: string[];
  accessibility: string[];
  badges: string[];
  rating: number;
  reviewCount: number;
  recommendations: number;
  views: number;
  featured?: boolean;
  claimed?: boolean;
  /** True only for live database listings that are unowned and not yet claimed. */
  claimable?: boolean;
  verified?: boolean;
  /** How verification was performed — shown on the profile. */
  verificationMethod?: 'attestation + documents' | 'review-team check' | 'credential check with issuer' | 'church recommendation';
  /** Days since the most recent verification pass. */
  lastVerifiedDaysAgo?: number;
  updatedDaysAgo?: number;
  /** ISO timestamp when the listing record was created. */
  createdAt?: string;
  /** ISO timestamp when a database listing was first published. */
  publishedAt?: string;
  /** ISO timestamp when the public listing record was last changed (not a verification timestamp). */
  updatedAt?: string;
  /** ISO timestamp of the last meaningful owner edit that was successfully published. */
  recentlyUpdatedAt?: string;
  foundedYear?: number;
  serviceArea?: string;
  social?: { facebook?: string; instagram?: string; youtube?: string; x?: string; linkedin?: string };
  photos?: SamplePhoto[];
  hours?: Record<string, string>;
  statementOfFaith?: string;
  reviews?: SampleReview[];
  addedDaysAgo?: number;
  openNow?: boolean;
  imageHue: number;
}
