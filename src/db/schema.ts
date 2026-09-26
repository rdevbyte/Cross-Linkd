/**
 * CrossLinkd — PostgreSQL schema (Drizzle ORM)
 *
 * Normalized, scalable relational design:
 * - One organization → many listings; one listing → many locations,
 *   industries, professions, denominations, services, hashtags, photos, events.
 * - UUID primary keys, FK constraints, timestamps, soft-delete, slugs.
 * - Full-text search via generated tsvector column + GIN index (see migration SQL).
 */
import {
  pgTable, uuid, text, varchar, boolean, integer, smallint, timestamp,
  numeric, jsonb, pgEnum, index, uniqueIndex, primaryKey,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};
const id = () => uuid('id').primaryKey().default(sql`gen_random_uuid()`);

// ---------------- Enums ----------------
export const userRoleEnum = pgEnum('user_role', [
  'super_admin', 'moderator', 'verification_reviewer', 'content_editor',
  'org_admin', 'listing_owner', 'member',
]);
export const listingStatusEnum = pgEnum('listing_status', [
  'draft', 'pending_review', 'published', 'suspended', 'archived',
  'rejected', 'changes_requested',
]);
export const verificationTypeEnum = pgEnum('verification_type', [
  'email', 'phone', 'domain', 'claimed', 'christian_owned',
  'ministry', 'church', 'professional_credential', 'nonprofit',
]);
export const verificationStatusEnum = pgEnum('verification_status', [
  'unverified', 'pending', 'verified', 'rejected', 'expired',
]);
export const claimStatusEnum = pgEnum('claim_status', ['pending', 'approved', 'rejected']);
export const reviewStatusEnum = pgEnum('review_status', [
  'pending', 'published', 'flagged', 'removed', 'appealed',
]);
export const reportStatusEnum = pgEnum('report_status', ['open', 'triaging', 'resolved', 'dismissed']);
export const eventFormatEnum = pgEnum('event_format', ['in_person', 'online', 'hybrid']);
export const memberRoleEnum = pgEnum('member_role', ['owner', 'admin', 'editor', 'viewer']);
export const notifTypeEnum = pgEnum('notification_type', [
  'listing_update', 'event_reminder', 'review_received', 'verification_update',
  'claim_update', 'recommendation', 'system',
]);

// ---------------- Users & orgs ----------------
export const users = pgTable('users', {
  id: id(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  passwordHash: text('password_hash'),
  displayName: varchar('display_name', { length: 120 }),
  avatarUrl: text('avatar_url'),
  role: userRoleEnum('role').default('member').notNull(),
  preferredDenominations: jsonb('preferred_denominations').$type<string[]>().default([]),
  preferredLocations: jsonb('preferred_locations').$type<string[]>().default([]),
  interests: jsonb('interests').$type<string[]>().default([]),
  notificationPrefs: jsonb('notification_prefs').$type<Record<string, boolean>>().default({}),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [index('users_email_idx').on(t.email), index('users_role_idx').on(t.role)]);

export const userProfiles = pgTable('user_profiles', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  bio: text('bio'),
  city: varchar('city', { length: 120 }),
  region: varchar('region', { length: 120 }),
  country: varchar('country', { length: 120 }),
  website: text('website'),
  ...timestamps,
});

export const sessions = pgTable('sessions', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ip: varchar('ip', { length: 64 }),
  userAgent: text('user_agent'),
  ...timestamps,
}, (t) => [index('sessions_user_idx').on(t.userId)]);

/**
 * Single-use auth tokens (email verification, password reset).
 * Only the SHA-256 hash of the token is stored; the raw value exists solely in
 * the emailed link and expires quickly.
 */
export const authTokens = pgTable('auth_tokens', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kind: varchar('kind', { length: 32 }).notNull(), // 'email_verify' | 'password_reset' | 'magic'
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [index('auth_tokens_user_idx').on(t.userId), index('auth_tokens_hash_idx').on(t.tokenHash)]);

export const magicLinks = pgTable('magic_links', {
  id: id(),
  email: varchar('email', { length: 255 }).notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  ...timestamps,
});

export const organizations = pgTable('organizations', {
  id: id(),
  name: varchar('name', { length: 200 }).notNull(),
  slug: varchar('slug', { length: 220 }).notNull().unique(),
  kind: varchar('kind', { length: 80 }),
  website: text('website'),
  logoUrl: text('logo_url'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  ...timestamps,
});

export const organizationMembers = pgTable('organization_members', {
  id: id(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: memberRoleEnum('role').default('editor').notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex('org_members_unique').on(t.organizationId, t.userId),
  index('org_members_user_idx').on(t.userId),
]);

// ---------------- Taxonomy: listing types ----------------
export const listingTypes = pgTable('listing_types', {
  id: id(),
  slug: varchar('slug', { length: 80 }).notNull().unique(),
  label: varchar('label', { length: 120 }).notNull(),
  pluralLabel: varchar('plural_label', { length: 120 }),
  description: text('description'),
  icon: varchar('icon', { length: 60 }),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  ...timestamps,
});

// ---------------- Taxonomy: industries / categories / professions ----------------
export const industries = pgTable('industries', {
  id: id(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  name: varchar('name', { length: 160 }).notNull(),
  description: text('description'),
  parentId: uuid('parent_id'),
  level: smallint('level').default(0).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  ...timestamps,
}, (t) => [index('industries_parent_idx').on(t.parentId), index('industries_slug_idx').on(t.slug)]);

export const industryCategories = pgTable('industry_categories', {
  id: id(),
  industryId: uuid('industry_id').notNull().references(() => industries.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  name: varchar('name', { length: 160 }).notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  ...timestamps,
}, (t) => [index('indcat_industry_idx').on(t.industryId)]);

export const professions = pgTable('professions', {
  id: id(),
  categoryId: uuid('category_id').references(() => industryCategories.id, { onDelete: 'set null' }),
  industryId: uuid('industry_id').references(() => industries.id, { onDelete: 'set null' }),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  name: varchar('name', { length: 160 }).notNull(),
  description: text('description'),
  aliases: jsonb('aliases').$type<string[]>().default([]),
  requiresLicense: boolean('requires_license').default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  ...timestamps,
}, (t) => [index('professions_cat_idx').on(t.categoryId), index('professions_slug_idx').on(t.slug)]);

// ---------------- Taxonomy: denominations ----------------
export const denominations = pgTable('denominations', {
  id: id(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  name: varchar('name', { length: 180 }).notNull(),
  tradition: varchar('tradition', { length: 180 }),
  parentId: uuid('parent_id'),
  description: text('description'),
  worshipStyles: jsonb('worship_styles').$type<string[]>().default([]),
  aliases: jsonb('aliases').$type<string[]>().default([]),
  searchTerms: jsonb('search_terms').$type<string[]>().default([]),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  ...timestamps,
}, (t) => [index('denominations_parent_idx').on(t.parentId), index('denominations_tradition_idx').on(t.tradition)]);

export const denominationAliases = pgTable('denomination_aliases', {
  id: id(),
  denominationId: uuid('denomination_id').notNull().references(() => denominations.id, { onDelete: 'cascade' }),
  alias: varchar('alias', { length: 180 }).notNull(),
  locale: varchar('locale', { length: 12 }).default('en'),
  ...timestamps,
}, (t) => [
  uniqueIndex('denom_alias_unique').on(t.denominationId, t.alias),
  index('denom_alias_alias_idx').on(t.alias),
]);

// ---------------- Hashtags ----------------
export const hashtags = pgTable('hashtags', {
  id: id(),
  tag: varchar('tag', { length: 80 }).notNull().unique(),
  kind: varchar('kind', { length: 40 }).default('general').notNull(),
  description: text('description'),
  usageCount: integer('usage_count').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  ...timestamps,
}, (t) => [index('hashtags_tag_idx').on(t.tag), index('hashtags_kind_idx').on(t.kind)]);

// ---------------- Listings ----------------
export const listings = pgTable('listings', {
  id: id(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
  typeId: uuid('type_id').references(() => listingTypes.id, { onDelete: 'set null' }),
  typeSlug: varchar('type_slug', { length: 80 }).notNull(),
  slug: varchar('slug', { length: 240 }).notNull().unique(),
  name: varchar('name', { length: 240 }).notNull(),
  tagline: varchar('tagline', { length: 280 }),
  description: text('description'),
  logoUrl: text('logo_url'),
  coverUrl: text('cover_url'),
  website: text('website'),
  phone: varchar('phone', { length: 60 }),
  email: varchar('email', { length: 255 }),
  showEmail: boolean('show_email').default(false).notNull(),
  showPhone: boolean('show_phone').default(false).notNull(),
  showWebsite: boolean('show_website').default(false).notNull(),
  showAddress: boolean('show_address').default(false).notNull(),
  showDenomination: boolean('show_denomination').default(true).notNull(),
  customDenomination: varchar('custom_denomination', { length: 180 }),
  denominationsList: jsonb('denominations_list').$type<string[]>().default([]).notNull(),
  industrySlug: varchar('industry_slug', { length: 120 }),
  categorySlug: varchar('category_slug', { length: 120 }),
  customCategory: varchar('custom_category', { length: 180 }),
  status: listingStatusEnum('status').default('published').notNull(),
  isClaimed: boolean('is_claimed').default(false).notNull(),
  isOnlineOnly: boolean('is_online_only').default(false).notNull(),
  priceRange: varchar('price_range', { length: 16 }),
  yearFounded: integer('year_founded'),
  employeeCount: varchar('employee_count', { length: 40 }),
  ownershipType: varchar('ownership_type', { length: 80 }),
  contactPreference: varchar('contact_preference', { length: 40 }),
  // Faith profile (neutral, descriptive)
  statementOfFaith: text('statement_of_faith'),
  coreBeliefs: jsonb('core_beliefs').$type<string[]>().default([]),
  worshipStyle: varchar('worship_style', { length: 120 }),
  baptismPractice: varchar('baptism_practice', { length: 160 }),
  communionPractice: varchar('communion_practice', { length: 160 }),
  ministryFocus: jsonb('ministry_focus').$type<string[]>().default([]),
  languages: jsonb('languages').$type<string[]>().default(['English']),
  // Professional specifics
  credentials: jsonb('credentials').$type<string[]>().default([]),
  licenseInfo: text('license_info'),
  professionalTitle: varchar('professional_title', { length: 160 }),
  availability: varchar('availability', { length: 160 }),
  // Operations
  hours: jsonb('hours').$type<Record<string, string>>().default({}),
  holidayHours: jsonb('holiday_hours').$type<Record<string, string>>().default({}),
  socialLinks: jsonb('social_links').$type<Record<string, string>>().default({}),
  accessibility: jsonb('accessibility').$type<string[]>().default([]),
  amenities: jsonb('amenities').$type<string[]>().default([]),
  serviceArea: jsonb('service_area').$type<string[]>().default([]),
  serviceAreaRadiusMi: integer('service_area_radius_mi'),
  // Metrics (denormalized counters)
  avgRating: numeric('avg_rating', { precision: 3, scale: 2 }).default('0'),
  reviewCount: integer('review_count').default(0).notNull(),
  recommendationCount: integer('recommendation_count').default(0).notNull(),
  viewCount: integer('view_count').default(0).notNull(),
  favoriteCount: integer('favorite_count').default(0).notNull(),
  completenessScore: smallint('completeness_score').default(0).notNull(),
  featuredRank: integer('featured_rank').default(0).notNull(),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  // Moderation trail (latest decision surfaced to the owner)
  reviewNote: text('review_note'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps,
}, (t) => [
  index('listings_slug_idx').on(t.slug),
  index('listings_type_idx').on(t.typeSlug),
  index('listings_status_idx').on(t.status),
  index('listings_owner_idx').on(t.ownerId),
  index('listings_org_idx').on(t.organizationId),
  index('listings_featured_idx').on(t.featuredRank),
  index('listings_rating_idx').on(t.avgRating),
  // Full-text GIN index is created in the migration SQL (search_vector).
]);

export const listingLocations = pgTable('listing_locations', {
  id: id(),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 160 }),
  addressLine1: varchar('address_line1', { length: 220 }),
  addressLine2: varchar('address_line2', { length: 220 }),
  city: varchar('city', { length: 120 }),
  region: varchar('region', { length: 120 }),
  postalCode: varchar('postal_code', { length: 24 }),
  country: varchar('country', { length: 120 }).default('United States'),
  latitude: numeric('latitude', { precision: 10, scale: 7 }),
  longitude: numeric('longitude', { precision: 10, scale: 7 }),
  isPrimary: boolean('is_primary').default(false).notNull(),
  ...timestamps,
}, (t) => [
  index('loc_listing_idx').on(t.listingId),
  index('loc_city_idx').on(t.city),
  index('loc_postal_idx').on(t.postalCode),
  index('loc_geo_idx').on(t.latitude, t.longitude),
]);

export const listingServices = pgTable('listing_services', {
  id: id(),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  priceFrom: numeric('price_from', { precision: 12, scale: 2 }),
  priceTo: numeric('price_to', { precision: 12, scale: 2 }),
  durationMin: integer('duration_min'),
  isOnline: boolean('is_online').default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  ...timestamps,
}, (t) => [index('services_listing_idx').on(t.listingId)]);

export const listingMedia = pgTable('listing_media', {
  id: id(),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  kind: varchar('kind', { length: 20 }).default('photo').notNull(),
  url: text('url').notNull(),
  alt: varchar('alt', { length: 220 }),
  sortOrder: integer('sort_order').default(0).notNull(),
  ...timestamps,
}, (t) => [index('media_listing_idx').on(t.listingId)]);

export const listingIndustries = pgTable('listing_industries', {
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  industryId: uuid('industry_id').notNull().references(() => industries.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.listingId, t.industryId] })]);

export const listingProfessions = pgTable('listing_professions', {
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  professionId: uuid('profession_id').notNull().references(() => professions.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.listingId, t.professionId] })]);

export const listingDenominations = pgTable('listing_denominations', {
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  denominationId: uuid('denomination_id').notNull().references(() => denominations.id, { onDelete: 'cascade' }),
  isPrimary: boolean('is_primary').default(false).notNull(),
}, (t) => [primaryKey({ columns: [t.listingId, t.denominationId] })]);

export const listingHashtags = pgTable('listing_hashtags', {
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  hashtagId: uuid('hashtag_id').notNull().references(() => hashtags.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.listingId, t.hashtagId] })]);

// ---------------- Events ----------------
export const eventCategories = pgTable('event_categories', {
  id: id(),
  slug: varchar('slug', { length: 80 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  ...timestamps,
});

export const events = pgTable('events', {
  id: id(),
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'set null' }),
  organizerId: uuid('organizer_id').references(() => users.id, { onDelete: 'set null' }),
  categoryId: uuid('category_id').references(() => eventCategories.id, { onDelete: 'set null' }),
  slug: varchar('slug', { length: 240 }).notNull().unique(),
  title: varchar('title', { length: 240 }).notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  format: eventFormatEnum('format').default('in_person').notNull(),
  venueName: varchar('venue_name', { length: 200 }),
  addressLine1: varchar('address_line1', { length: 220 }),
  city: varchar('city', { length: 120 }),
  region: varchar('region', { length: 120 }),
  postalCode: varchar('postal_code', { length: 24 }),
  country: varchar('country', { length: 120 }).default('United States'),
  latitude: numeric('latitude', { precision: 10, scale: 7 }),
  longitude: numeric('longitude', { precision: 10, scale: 7 }),
  onlineUrl: text('online_url'),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  timezone: varchar('timezone', { length: 60 }).default('America/Chicago'),
  recurrence: varchar('recurrence', { length: 80 }),
  registrationUrl: text('registration_url'),
  cost: varchar('cost', { length: 80 }).default('Free'),
  ageGroup: varchar('age_group', { length: 80 }),
  languages: jsonb('languages').$type<string[]>().default(['English']),
  accessibility: jsonb('accessibility').$type<string[]>().default([]),
  status: listingStatusEnum('status').default('published').notNull(),
  attendeeCount: integer('attendee_count').default(0).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [
  index('events_slug_idx').on(t.slug),
  index('events_starts_idx').on(t.startsAt),
  index('events_city_idx').on(t.city),
  index('events_listing_idx').on(t.listingId),
]);

export const eventAttendees = pgTable('event_attendees', {
  id: id(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  email: varchar('email', { length: 255 }),
  status: varchar('status', { length: 24 }).default('interested').notNull(),
  ...timestamps,
}, (t) => [index('attendees_event_idx').on(t.eventId)]);

// ---------------- Reviews & recommendations ----------------
export const reviews = pgTable('reviews', {
  id: id(),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  rating: smallint('rating').notNull(),
  serviceQuality: smallint('service_quality'),
  professionalism: smallint('professionalism'),
  responsiveness: smallint('responsiveness'),
  faithAlignment: smallint('faith_alignment'),
  title: varchar('title', { length: 160 }),
  body: text('body'),
  verifiedInteraction: boolean('verified_interaction').default(false).notNull(),
  status: reviewStatusEnum('status').default('pending').notNull(),
  ownerResponse: text('owner_response'),
  ownerRespondedAt: timestamp('owner_responded_at', { withTimezone: true }),
  helpfulCount: integer('helpful_count').default(0).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [
  index('reviews_listing_idx').on(t.listingId),
  index('reviews_status_idx').on(t.status),
  index('reviews_author_idx').on(t.authorId),
]);

export const recommendations = pgTable('recommendations', {
  id: id(),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  note: varchar('note', { length: 280 }),
  ...timestamps,
}, (t) => [
  uniqueIndex('rec_unique').on(t.listingId, t.userId),
  index('rec_listing_idx').on(t.listingId),
]);

// ---------------- Verification & claims ----------------
export const verificationBadges = pgTable('verification_badges', {
  id: id(),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  type: verificationTypeEnum('type').notNull(),
  status: verificationStatusEnum('status').default('unverified').notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  note: text('note'),
  ...timestamps,
}, (t) => [
  uniqueIndex('badge_unique').on(t.listingId, t.type),
  index('badge_listing_idx').on(t.listingId),
]);

export const verificationRequests = pgTable('verification_requests', {
  id: id(),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  requesterId: uuid('requester_id').references(() => users.id, { onDelete: 'set null' }),
  type: verificationTypeEnum('type').notNull(),
  status: verificationStatusEnum('status').default('pending').notNull(),
  evidence: jsonb('evidence').$type<Record<string, unknown>>().default({}),
  reviewerId: uuid('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewNote: text('review_note'),
  ...timestamps,
}, (t) => [
  index('vereq_listing_idx').on(t.listingId),
  index('vereq_status_idx').on(t.status),
]);

export const verificationDocuments = pgTable('verification_documents', {
  id: id(),
  requestId: uuid('request_id').notNull().references(() => verificationRequests.id, { onDelete: 'cascade' }),
  fileUrl: text('file_url').notNull(),
  fileName: varchar('file_name', { length: 220 }),
  mimeType: varchar('mime_type', { length: 120 }),
  ...timestamps,
});

export const listingClaims = pgTable('listing_claims', {
  id: id(),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  claimantId: uuid('claimant_id').references(() => users.id, { onDelete: 'set null' }),
  claimantName: varchar('claimant_name', { length: 160 }),
  claimantEmail: varchar('claimant_email', { length: 255 }),
  relationship: varchar('relationship', { length: 120 }),
  evidence: text('evidence'),
  status: claimStatusEnum('status').default('pending').notNull(),
  reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [
  index('claims_listing_idx').on(t.listingId),
  index('claims_status_idx').on(t.status),
]);

// ---------------- Personalization ----------------
export const savedListings = pgTable('saved_listings', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.listingId] })]);

export const savedSearches = pgTable('saved_searches', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 160 }),
  query: text('query'),
  filters: jsonb('filters').$type<Record<string, unknown>>().default({}),
  notifyOnNew: boolean('notify_on_new').default(false).notNull(),
  ...timestamps,
}, (t) => [index('savedsearch_user_idx').on(t.userId)]);

export const collections = pgTable('collections', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 200 }).notNull(),
  name: varchar('name', { length: 180 }).notNull(),
  description: text('description'),
  isPublic: boolean('is_public').default(false).notNull(),
  ...timestamps,
}, (t) => [index('collections_user_idx').on(t.userId)]);

export const collectionItems = pgTable('collection_items', {
  collectionId: uuid('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  note: varchar('note', { length: 280 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.collectionId, t.listingId] })]);

export const follows = pgTable('follows', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.listingId] })]);

// ---------------- Moderation & reports ----------------
export const reports = pgTable('reports', {
  id: id(),
  reporterId: uuid('reporter_id').references(() => users.id, { onDelete: 'set null' }),
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'cascade' }),
  reviewId: uuid('review_id').references(() => reviews.id, { onDelete: 'cascade' }),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }),
  reason: varchar('reason', { length: 80 }).notNull(),
  details: text('details'),
  status: reportStatusEnum('status').default('open').notNull(),
  resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [index('reports_status_idx').on(t.status)]);

export const moderationActions = pgTable('moderation_actions', {
  id: id(),
  moderatorId: uuid('moderator_id').references(() => users.id, { onDelete: 'set null' }),
  targetType: varchar('target_type', { length: 40 }).notNull(),
  targetId: uuid('target_id').notNull(),
  action: varchar('action', { length: 60 }).notNull(),
  reason: text('reason'),
  ...timestamps,
}, (t) => [index('mod_target_idx').on(t.targetType, t.targetId)]);

export const listingEdits = pgTable('listing_edits', {
  id: id(),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  suggestedBy: uuid('suggested_by').references(() => users.id, { onDelete: 'set null' }),
  changes: jsonb('changes').$type<Record<string, unknown>>().default({}),
  status: claimStatusEnum('status').default('pending').notNull(),
  reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps,
}, (t) => [index('edits_listing_idx').on(t.listingId)]);

// ---------------- Monetization (Phase 2 ready) ----------------
export const subscriptions = pgTable('subscriptions', {
  id: id(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'cascade' }),
  plan: varchar('plan', { length: 60 }).notNull(),
  status: varchar('status', { length: 40 }).default('active').notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 120 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 120 }),
  ...timestamps,
});

export const payments = pgTable('payments', {
  id: id(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),
  amountCents: integer('amount_cents').notNull(),
  currency: varchar('currency', { length: 8 }).default('USD').notNull(),
  status: varchar('status', { length: 40 }).notNull(),
  stripePaymentId: varchar('stripe_payment_id', { length: 120 }),
  ...timestamps,
});

export const featuredPlacements = pgTable('featured_placements', {
  id: id(),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  slot: varchar('slot', { length: 60 }).notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  isSponsored: boolean('is_sponsored').default(false).notNull(),
  ...timestamps,
}, (t) => [index('featured_slot_idx').on(t.slot)]);

// ---------------- Analytics / logs / notifications ----------------
export const searchLogs = pgTable('search_logs', {
  id: id(),
  query: text('query'),
  hashtags: jsonb('hashtags').$type<string[]>().default([]),
  filters: jsonb('filters').$type<Record<string, unknown>>().default({}),
  resultCount: integer('result_count').default(0),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps,
}, (t) => [index('searchlogs_created_idx').on(t.createdAt)]);

export const listingViews = pgTable('listing_views', {
  id: id(),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  source: varchar('source', { length: 60 }),
  referrer: text('referrer'),
  ...timestamps,
}, (t) => [index('views_listing_idx').on(t.listingId)]);

export const auditLogs = pgTable('audit_logs', {
  id: id(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 120 }).notNull(),
  targetType: varchar('target_type', { length: 60 }),
  targetId: varchar('target_id', { length: 120 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  ...timestamps,
}, (t) => [index('audit_target_idx').on(t.targetType, t.targetId)]);

export const notifications = pgTable('notifications', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notifTypeEnum('type').notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  body: text('body'),
  link: text('link'),
  readAt: timestamp('read_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [index('notif_user_idx').on(t.userId)]);

// ---------------- Relations ----------------
export const listingsRelations = relations(listings, ({ many, one }) => ({
  locations: many(listingLocations),
  services: many(listingServices),
  media: many(listingMedia),
  industries: many(listingIndustries),
  professions: many(listingProfessions),
  denominations: many(listingDenominations),
  hashtags: many(listingHashtags),
  reviews: many(reviews),
  badges: many(verificationBadges),
  events: many(events),
  owner: one(users, { fields: [listings.ownerId], references: [users.id] }),
}));

export const listingIndustriesRelations = relations(listingIndustries, ({ one }) => ({
  listing: one(listings, { fields: [listingIndustries.listingId], references: [listings.id] }),
  industry: one(industries, { fields: [listingIndustries.industryId], references: [industries.id] }),
}));
