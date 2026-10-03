/**
 * Seed script — loads listing types, industries, professions, denominations,
 * hashtags, event categories, and sample listings into Postgres.
 * Usage: DATABASE_URL=... npm run db:seed
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { LISTING_TYPES } from '../data/listing-types';
import { INDUSTRIES } from '../data/industries';
import { DENOMINATIONS, TRADITIONS } from '../data/denominations';
import { HASHTAG_CATALOG } from '../data/hashtags';
import { SAMPLE_LISTINGS } from '../data/listings';

async function main() {
  const taxonomyOnly = process.argv.includes('--taxonomy') || process.env.SEED_TAXONOMY_ONLY === '1';
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required to seed.');
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  console.log('🌱 Seeding CrossLinkd…');

  // Listing types
  for (const [i, t] of LISTING_TYPES.entries()) {
    await db.insert(schema.listingTypes).values({
      slug: t.slug, label: t.label, pluralLabel: t.plural,
      description: t.description, icon: t.icon, sortOrder: i,
    }).onConflictDoNothing();
  }
  console.log(`  ✓ ${LISTING_TYPES.length} listing types`);

  // Industries → categories → professions
  for (const ind of INDUSTRIES) {
    const [row] = await db.insert(schema.industries).values({
      slug: ind.slug, name: ind.name, description: ind.description, aliases: ind.aliases ?? [], keywords: ind.keywords ?? [], level: 0,
    }).onConflictDoUpdate({ target: schema.industries.slug, set: { name: ind.name, description: ind.description, aliases: ind.aliases ?? [], keywords: ind.keywords ?? [], level: 0, isActive: true, updatedAt: new Date() } }).returning({ id: schema.industries.id });
    const industryId = row?.id ?? (await db.query.industries.findFirst({
      where: (t, { eq }) => eq(t.slug, ind.slug),
    }))?.id;
    if (!industryId) continue;
    for (const cat of ind.categories) {
      const [crow] = await db.insert(schema.industryCategories).values({
        industryId, slug: cat.slug, name: cat.name, aliases: cat.aliases ?? [], keywords: cat.keywords ?? [],
      }).onConflictDoUpdate({ target: schema.industryCategories.slug, set: { industryId, name: cat.name, aliases: cat.aliases ?? [], keywords: cat.keywords ?? [], isActive: true, updatedAt: new Date() } }).returning({ id: schema.industryCategories.id });
      const categoryId = crow?.id ?? (await db.query.industryCategories.findFirst({
        where: (t, { eq }) => eq(t.slug, cat.slug),
      }))?.id;
      for (const p of cat.professions) {
        await db.insert(schema.professions).values({
          categoryId: categoryId ?? null, industryId,
          slug: p.slug, name: p.name,
          aliases: p.aliases ?? [], keywords: p.keywords ?? [], serviceExamples: p.services ?? [], requiresLicense: p.requiresLicense ?? false, isActive: true,
        }).onConflictDoUpdate({ target: schema.professions.slug, set: { categoryId: categoryId ?? null, industryId, name: p.name, aliases: p.aliases ?? [], keywords: p.keywords ?? [], serviceExamples: p.services ?? [], requiresLicense: p.requiresLicense ?? false, isActive: true, updatedAt: new Date() } });
      }
    }
  }
  console.log(`  ✓ ${INDUSTRIES.length} industries (+ categories, professions)`);

  // Denominations
  for (const t of TRADITIONS) {
    await db.insert(schema.denominations).values({
      slug: `tradition-${t.slug}`, name: t.name, tradition: t.slug, description: t.description,
    }).onConflictDoNothing();
  }
  for (const d of DENOMINATIONS) {
    await db.insert(schema.denominations).values({
      slug: d.slug, name: d.name, tradition: d.tradition, description: d.description,
      aliases: d.aliases, searchTerms: d.searchTerms,
    }).onConflictDoNothing();
    for (const alias of d.aliases) {
      const parent = await db.query.denominations.findFirst({
        where: (t, { eq }) => eq(t.slug, d.slug),
      });
      if (parent) {
        await db.insert(schema.denominationAliases).values({ denominationId: parent.id, alias }).onConflictDoNothing();
      }
    }
  }
  console.log(`  ✓ ${DENOMINATIONS.length} denominations (+ tradition parents, aliases)`);

  // Hashtags
  for (const h of HASHTAG_CATALOG) {
    await db.insert(schema.hashtags).values({ tag: h.tag, kind: h.kind }).onConflictDoNothing();
  }
  console.log(`  ✓ ${HASHTAG_CATALOG.length} hashtags`);

  // Event categories
  for (const c of ['Worship', 'Bible Study', 'Conference', 'Concert', 'Retreat', 'Volunteer', 'Networking', 'Youth', 'Outreach', 'Mission Trip']) {
    await db.insert(schema.eventCategories).values({
      slug: c.toLowerCase().replace(/\s+/g, '-'), name: c,
    }).onConflictDoNothing();
  }
  console.log('  ✓ event categories');

  // Sample listings (skip with --taxonomy: bundled sample data already powers
  // previews; DB copies would duplicate them once approved listings merge in).
  for (const l of taxonomyOnly ? [] : SAMPLE_LISTINGS) {
    await db.insert(schema.listings).values({
      slug: l.slug, name: l.name, typeSlug: l.typeSlug,
      tagline: l.tagline, description: l.description,
      website: l.website ?? null, phone: l.phone ?? null, email: l.email ?? null,
      status: 'published', isClaimed: l.claimed ?? false,
      isOnlineOnly: l.isOnlineOnly ?? false, priceRange: l.priceRange || null,
      statementOfFaith: l.statementOfFaith ?? null,
      languages: l.languages, accessibility: l.accessibility,
      avgRating: String(l.rating), reviewCount: l.reviewCount,
      recommendationCount: l.recommendations, viewCount: l.views,
      featuredRank: l.featured ? 1 : 0, publishedAt: new Date(),
    }).onConflictDoNothing();
  }
  console.log(`  ✓ sample listings seeded`);

  await pool.end();
  console.log('✅ Seed complete. Soli Deo Gloria!');
}

main().catch((err) => { console.error(err); process.exit(1); });
