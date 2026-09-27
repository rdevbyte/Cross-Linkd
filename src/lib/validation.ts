import { z } from 'zod';
import { careersUrlError } from './hiringUrl.mjs';

/** Operating-hours presets expanded into the profile's day-map shape (see seed samples). */
const HOUR_PRESETS: Record<string, Record<string, string>> = {
  standard: { 'Mon–Fri': '9a–5p', Sat: 'Closed', Sun: 'Closed' },
  extended: { 'Mon–Fri': '8a–8p', Sat: '9a–5p', Sun: 'Closed' },
  weekends: { Sat: '9a–5p', Sun: '12p–4p' },
  appointment: { 'By appointment': 'Call or email to schedule' },
  always: { 'Every day': 'Open 24 hours' },
  vary: { 'Hours vary': 'Contact us for current hours' },
};

export const searchFilterSchema = z.object({
  q: z.string().max(300).default(''),
  near: z.string().max(160).optional(),
  type: z.array(z.string()).default([]),
  denomination: z.array(z.string()).default([]),
  industry: z.array(z.string()).default([]),
  profession: z.array(z.string()).default([]),
  category: z.array(z.string()).default([]),
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
  sort: z.enum(['relevance', 'distance', 'rating', 'newest', 'featured', 'recommended', 'popular']).default('relevance'),
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(50).default(12),
});
export type SearchFilters = z.infer<typeof searchFilterSchema>;

export const listingInputSchema = z.object({
  name: z.string().min(2).max(240),
  typeSlug: z.string().min(2).max(80),
  tagline: z.string().max(280).optional(),
  description: z.string().max(8000).optional(),
  website: z.string().url().optional().or(z.literal('')),
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
    .string()
    .max(300)
    .optional()
    .transform((v) => (v === undefined ? undefined : v.trim() ? [v.trim()] : [])),
  hours: z
    .enum(['', 'standard', 'extended', 'weekends', 'appointment', 'always', 'vary'])
    .optional()
    .transform((v) => (v === undefined ? undefined : HOUR_PRESETS[v] ?? {})),
  contactPreference: z.enum(['', 'Email', 'Phone call', 'Text message', 'Any is fine']).optional(),
  statementOfFaith: z.string().max(8000).optional(),
  industrySlug: z.string().max(120).optional(),
  categorySlug: z.string().max(120).optional(),
  customCategory: z.string().max(180).optional(),
  industries: z.array(z.string()).default([]),
  professions: z.array(z.string()).default([]),
  denominations: z.array(z.string()).max(2, 'You can select up to two denominations.').default([]),
  hashtags: z.array(z.string().max(80)).default([]),
  languages: z.array(z.string()).default(['English']),
  accessibility: z.array(z.string()).default([]),
}).superRefine((data, ctx) => {
  const message = careersUrlError(data.careersUrl ?? '');
  if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['careersUrl'], message });
});

export const reviewInputSchema = z.object({
  listingId: z.string().min(1),
  rating: z.number().min(1).max(5),
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
  action: z.enum(['publish', 'save', 'submit', 'resubmit', 'draft']).default('publish'),
  listing: listingInputSchema.partial().required({ name: true, typeSlug: true }),
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
