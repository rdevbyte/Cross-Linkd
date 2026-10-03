import { validateTaxonomySelection } from '@/data/industries';
import { z } from 'zod';
import { careersUrlError } from './hiringUrl.mjs';
import { HOURS_PRESETS as HOURS_PRESETS_DATA } from './hoursSchedule.mjs';

/** Typed compatibility view for legacy quick-fill keys accepted by listing APIs. */
const HOUR_PRESETS = HOURS_PRESETS_DATA as Record<string, Record<string, string>>;

export const searchFilterSchema = z.object({
  q: z.string().max(300).default(''),
  near: z.string().max(160).optional(),
  type: z.array(z.string()).default([]),
  denomination: z.array(z.string()).default([]),
  industry: z.array(z.string()).default([]),
  profession: z.array(z.string()).default([]),
  category: z.array(z.string()).default([]),
  service: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
  city: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  postal: z.string().max(24).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusMi: z.coerce.number().min(1).max(500).default(25),
  verifiedOnly: z.coerce.boolean().default(false),
  openNow: z.coerce.boolean().default(false),
  onlineOnly: z.coerce.boolean().default(false),
  minRating: z.coerce.number().min(0).max(5).default(0),
  price: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  accessibility: z.array(z.string()).default([]),
  sort: z.enum(['relevance', 'distance', 'rating', 'newest', 'recently-updated', 'featured', 'recommended', 'popular']).default('relevance'),
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(50).default(12),
});
export type SearchFilters = z.infer<typeof searchFilterSchema>;

/**
 * Base object shape. Kept separate from `listingInputSchema` because a
 * `.superRefine()`-wrapped schema (ZodEffects) has no `.partial()`; deriving the
 * PATCH schema from the refined schema threw at module load and took every
 * importer (auth, listings, reviews, admin) down with it.
 */
const listingInputBase = z.object({
  name: z.string().min(2).max(240),
  typeSlug: z.string().min(2).max(80),
  tagline: z.string().max(280).optional(),
  description: z.string().max(8000).optional(),
  // Protocol is enforced in `refineListingUrls` (http/https only) — `z.string().url()`
  // alone accepts `javascript:` and `data:` URLs, which are rendered as hrefs.
  website: z.string().max(2000).optional().or(z.literal('')),
  logoUrl: z.string().max(2000).optional().or(z.literal('')),
  coverUrl: z.string().max(2000).optional().or(z.literal('')),
  socialLinks: z.object({
    facebook: z.string().max(2000).optional().or(z.literal('')),
    instagram: z.string().max(2000).optional().or(z.literal('')),
    youtube: z.string().max(2000).optional().or(z.literal('')),
    x: z.string().max(2000).optional().or(z.literal('')),
    linkedin: z.string().max(2000).optional().or(z.literal('')),
  }).partial().optional(),
  photos: z.array(z.object({
    url: z.string().max(2000),
    caption: z.string().max(240).optional(),
    alt: z.string().max(240).optional(),
  })).max(12).optional(),
  phone: z.string().max(60).optional(),
  email: z.string().email().optional().or(z.literal('')),
  showEmail: z.boolean().default(false),
  showPhone: z.boolean().default(false),
  showWebsite: z.boolean().default(false),
  showAddress: z.boolean().default(false),
  showDenomination: z.boolean().default(true),
  customDenomination: z.string().max(180).optional(),
  city: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  postalCode: z.string().max(24).optional(),
  country: z.string().max(120).default('United States'),
  isOnlineOnly: z.boolean().default(false),
  isHiring: z.boolean().default(false),
  careersUrl: z.string().max(2000).optional().or(z.literal('')),
  priceRange: z.enum(['$', '$$', '$$$', '$$$$', '']).default(''),
  yearFounded: z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional(),
  employeeCount: z
    .enum(['Solo (just me)', '2–10', '11–50', '51–200', '201–500', '500+', ''])
    .optional(),
  ownershipType: z
    .enum([
      'Privately owned',
      'Family-owned',
      'Partnership',
      'Corporation',
      'Cooperative',
      'Nonprofit / ministry-run',
      'Government / public',
      '',
    ])
    .optional(),
  serviceArea: z
    .union([z.string().max(300), z.array(z.string().trim().min(1).max(200)).max(20)])
    .optional()
    .transform((v) => v === undefined ? undefined : Array.isArray(v) ? v : v.trim() ? [v.trim()] : []),
  hours: z
    .union([
      z.enum(['', 'standard', 'extended', 'weekends', 'appointment', 'always', 'vary']),
      z.record(z.string().max(80), z.string().max(240)),
    ])
    .optional()
    .transform((v) => (v === undefined ? undefined : typeof v === 'string' ? HOUR_PRESETS[v] ?? {} : v)),
  contactPreference: z.enum(['', 'Email', 'Phone call', 'Text message', 'Any is fine']).optional(),
  statementOfFaith: z.string().max(8000).optional(),
  coreBeliefs: z.array(z.string().trim().min(1).max(240)).max(24).optional(),
  worshipStyle: z.string().max(120).optional(),
  baptismPractice: z.string().max(160).optional(),
  communionPractice: z.string().max(160).optional(),
  ministryFocus: z.array(z.string().trim().min(1).max(180)).max(24).optional(),
  holidayHours: z.record(z.string().max(120), z.string().max(240)).optional(),
  serviceAreaRadiusMi: z.coerce.number().int().min(1).max(500).optional(),
  industrySlug: z.string().max(120).optional(),
  categorySlug: z.string().max(120).optional(),
  customCategory: z.string().max(180).optional(),
  industries: z.array(z.string()).max(12, 'Choose no more than 12 industries.').default([]),
  professions: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
  customProfessions: z.array(z.string().trim().min(1).max(120)).max(8).default([]),
  services: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  denominations: z.array(z.string()).max(2, 'You can select up to two denominations.').default([]),
  hashtags: z.array(z.string().max(80)).default([]),
  languages: z.array(z.string()).default(['English']),
  accessibility: z.array(z.string()).default([]),
});

/** Cross-field URL checks shared by the full and the partial (PATCH) schema. */
const refineListingUrls = (data: { careersUrl?: string; website?: string; logoUrl?: string; coverUrl?: string; socialLinks?: Record<string, string | undefined>; photos?: Array<{ url: string }> }, ctx: z.RefinementCtx) => {
  for (const [field, value] of Object.entries({ careersUrl: data.careersUrl, website: data.website, logoUrl: data.logoUrl, coverUrl: data.coverUrl })) {
    const message = careersUrlError(value ?? '');
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
  }
  for (const [network, value] of Object.entries(data.socialLinks ?? {})) {
    const message = careersUrlError(value ?? '');
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['socialLinks', network], message });
  }
  for (const [index, photo] of (data.photos ?? []).entries()) {
    const message = careersUrlError(photo.url);
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['photos', index, 'url'], message });
  }
};

export const listingInputSchema = listingInputBase.superRefine(refineListingUrls).superRefine((data, ctx) => {
  if ((data.description ?? '').length > 500) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['description'], message: 'Description must be 500 characters or fewer.' });
  }
  for (const issue of validateTaxonomySelection({ industrySlug: data.industrySlug, categorySlug: data.categorySlug, industries: data.industries, professions: data.professions, customProfessions: data.customProfessions, customCategory: data.customCategory, services: data.services })) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [issue.path], message: issue.message });
  }
});

export const reviewInputSchema = z.object({
  listingId: z.string().uuid('Select a listing.'),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(160).optional(),
  body: z.string().max(3000).optional(),
  serviceQuality: z.number().min(1).max(5).optional(),
  professionalism: z.number().min(1).max(5).optional(),
  responsiveness: z.number().min(1).max(5).optional(),
  faithAlignment: z.number().min(1).max(5).optional(),
});

export const claimInputSchema = z.object({
  listingId: z.string().min(1),
  claimantName: z.string().min(2).max(160),
  claimantEmail: z.string().email(),
  relationship: z.string().min(2).max(120),
  evidence: z.string().min(10).max(3000),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(120),
});

export const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ---------------- Launch workflow schemas ----------------

/** Submitting for review requires richer data than saving a draft. */
export const listingSubmitRequirements = {
  description: z.string().min(30, 'Description must be at least 30 characters.').max(8000),
  city: z.string().min(2, 'City is required to submit.').max(120),
  region: z.string().min(2, 'State/region is required to submit.').max(120),
};

export const listingActionSchema = z.object({
  action: z.enum(['publish', 'draft', 'submit', 'resubmit', 'save']).default('publish'),
  listing: listingInputSchema,
});

export const listingPatchSchema = z.object({
  action: z.enum(['publish', 'save', 'submit', 'resubmit', 'draft']).default('save'),
  listing: listingInputBase.partial().required({ name: true, typeSlug: true }).superRefine(refineListingUrls),
});

export const moderationActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'request_changes', 'delete']),
  note: z.string().max(2000).optional(),
});

export const roleUpdateSchema = z.object({
  role: z.enum(['super_admin', 'moderator', 'verification_reviewer', 'content_editor', 'org_admin', 'listing_owner', 'member']),
});

export const resetRequestSchema = z.object({ email: z.string().email() });

export const resetConfirmSchema = z.object({
  token: z.string().min(10).max(128),
  password: z.string().min(8).max(128),
});

export const magicRequestSchema = z.object({
  email: z.string().email(),
  next: z.string().max(300).optional(),
});
