import { and, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import {
  denominations, hashtags, industries, industryCategories, listingDenominations,
  listingHashtags, listingIndustries, listingLocations, listingProfessions,
  listingServices, listings, professions, searchLogs,
} from '@/db/schema';
import type { SampleListing } from '@/data/listings';
import { categoryBySlug, canonicalIndustrySlug, canonicalProfessionSlug } from '@/data/industries';
import { DENOMINATIONS } from '@/data/denominations';
import { resolveLocation } from '@/data/locations';
import { parseQuery } from '@/lib/hashtags';
import { includeSamples } from '@/lib/sampleGate';
import { RECENTLY_UPDATED_WINDOW_MS } from '@/lib/recentlyUpdated.mjs';
import { getDbListings, getDbListingsByIds } from '@/lib/publicListings';
import { searchListings, buildAltLinks, buildSuggestions, type SearchHit, type SearchResult } from '@/lib/search';
import type { SearchFilters } from '@/lib/validation';

export type PublicSearchFilters = Partial<SearchFilters> & { q?: string; near?: string };

let searchEventsSincePrune = 0;
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');
const like = (value: string) => `%${escapeLike(value)}%`;

function existsLocation(predicate: SQL): SQL {
  return sql`EXISTS (
    SELECT 1 FROM ${listingLocations}
    WHERE ${listingLocations.listingId} = ${listings.id}
      AND ${listingLocations.isPrimary} = true
      AND (${predicate})
  )`;
}

function existsService(pattern: string): SQL {
  return sql`EXISTS (
    SELECT 1 FROM ${listingServices}
    WHERE ${listingServices.listingId} = ${listings.id}
      AND ${listingServices.name} ILIKE ${pattern}
  )`;
}

function existsProfession(pattern: string): SQL {
  return sql`EXISTS (
    SELECT 1 FROM ${listingProfessions}
    INNER JOIN ${professions} ON ${professions.id} = ${listingProfessions.professionId}
    WHERE ${listingProfessions.listingId} = ${listings.id}
      AND (${professions.name} ILIKE ${pattern}
        OR ${professions.slug} ILIKE ${pattern}
        OR ${professions.aliases}::text ILIKE ${pattern}
        OR ${professions.keywords}::text ILIKE ${pattern})
  )`;
}

function resolveDenominationSlugs(values: string[]): string[] {
  const normalized = values.map((value) => value.trim().toLowerCase());
  const matches = DENOMINATIONS.filter((item) => [item.slug, item.name, ...item.aliases, ...item.searchTerms]
    .some((candidate) => normalized.includes(candidate.toLowerCase()))).map((item) => item.slug);
  return [...new Set([...values, ...matches])];
}

function addTextSearch(conditions: SQL[], term: string): void {
  if (!term) return;
  const pattern = like(term);
  conditions.push(or(
    sql`search_vector @@ websearch_to_tsquery('english', ${term})`,
    ilike(listings.name, pattern),
    ilike(listings.tagline, pattern),
    ilike(listings.description, pattern),
    ilike(listings.industrySlug, pattern),
    ilike(listings.categorySlug, pattern),
    ilike(listings.customCategory, pattern),
    sql`${listings.customProfessions}::text ILIKE ${pattern}`,
    sql`${listings.languages}::text ILIKE ${pattern}`,
    sql`${listings.accessibility}::text ILIKE ${pattern}`,
    sql`${listings.amenities}::text ILIKE ${pattern}`,
    existsLocation(or(ilike(listingLocations.city, pattern), ilike(listingLocations.region, pattern), ilike(listingLocations.country, pattern))!),
    existsService(pattern),
    existsProfession(pattern),
    sql`EXISTS (
      SELECT 1 FROM ${listingIndustries}
      INNER JOIN ${industries} ON ${industries.id} = ${listingIndustries.industryId}
      WHERE ${listingIndustries.listingId} = ${listings.id}
        AND (${industries.name} ILIKE ${pattern} OR ${industries.slug} ILIKE ${pattern}
          OR ${industries.aliases}::text ILIKE ${pattern} OR ${industries.keywords}::text ILIKE ${pattern})
    )`,
    sql`EXISTS (
      SELECT 1 FROM ${listingDenominations}
      INNER JOIN ${denominations} ON ${denominations.id} = ${listingDenominations.denominationId}
      WHERE ${listingDenominations.listingId} = ${listings.id}
        AND (${denominations.name} ILIKE ${pattern} OR ${denominations.slug} ILIKE ${pattern}
          OR ${denominations.aliases}::text ILIKE ${pattern} OR ${denominations.searchTerms}::text ILIKE ${pattern})
    )`,
  )!);
}

function addHashtagFilters(conditions: SQL[], tags: string[]): void {
  for (const tag of tags) {
    const plain = tag.replace(/^#/, '').toLowerCase();
    const normalized = plain.replace(/[^a-z0-9]/g, '');
    const pattern = like(plain);
    conditions.push(sql`EXISTS (
      SELECT 1 FROM ${listingHashtags}
      INNER JOIN ${hashtags} ON ${hashtags.id} = ${listingHashtags.hashtagId}
      WHERE ${listingHashtags.listingId} = ${listings.id}
        AND (lower(replace(${hashtags.tag}, '-', '')) = ${normalized}
          OR lower(${hashtags.tag}) ILIKE ${pattern})
    ) OR EXISTS (
      SELECT 1 FROM ${listingDenominations}
      INNER JOIN ${denominations} ON ${denominations.id} = ${listingDenominations.denominationId}
      WHERE ${listingDenominations.listingId} = ${listings.id}
        AND (lower(replace(${denominations.slug}, '-', '')) = ${normalized}
          OR lower(replace(${denominations.name}, ' ', '')) = ${normalized}
          OR ${denominations.aliases}::text ILIKE ${pattern}
          OR ${denominations.searchTerms}::text ILIKE ${pattern})
    ) OR EXISTS (
      SELECT 1 FROM ${listingIndustries}
      INNER JOIN ${industries} ON ${industries.id} = ${listingIndustries.industryId}
      WHERE ${listingIndustries.listingId} = ${listings.id}
        AND (lower(replace(${industries.slug}, '-', '')) = ${normalized}
          OR ${industries.aliases}::text ILIKE ${pattern})
    ) OR EXISTS (
      SELECT 1 FROM ${listingProfessions}
      INNER JOIN ${professions} ON ${professions.id} = ${listingProfessions.professionId}
      WHERE ${listingProfessions.listingId} = ${listings.id}
        AND (lower(replace(${professions.slug}, '-', '')) = ${normalized}
          OR ${professions.aliases}::text ILIKE ${pattern}
          OR ${professions.keywords}::text ILIKE ${pattern})
    ) OR EXISTS (
      SELECT 1 FROM ${listingLocations}
      WHERE ${listingLocations.listingId} = ${listings.id} AND ${listingLocations.isPrimary} = true
        AND lower(regexp_replace(COALESCE(${listingLocations.city}, ''), '[^a-z0-9]', '', 'g')) = ${normalized}
    ) OR lower(replace(${listings.typeSlug}, '-', '')) = ${normalized}
      OR lower(replace(coalesce(${listings.industrySlug}, ''), '-', '')) = ${normalized}
      OR lower(replace(coalesce(${listings.categorySlug}, ''), '-', '')) = ${normalized}
      OR (${normalized} = 'claimed' AND ${listings.isClaimed} = true)`);
  }
}

function buildConditions(filters: PublicSearchFilters, text: string, tags: string[]): SQL[] {
  const conditions: SQL[] = [eq(listings.status, 'published'), isNull(listings.deletedAt)];
  addTextSearch(conditions, text);
  addHashtagFilters(conditions, tags);

  if (filters.type?.length) conditions.push(inArray(listings.typeSlug, filters.type.slice(0, 12)));

  if (filters.denomination?.length) {
    const slugs = resolveDenominationSlugs(filters.denomination.slice(0, 12));
    conditions.push(or(
      sql`${listings.denominationsList} ?| array[${sql.join(slugs.map((slug) => sql`${slug}`), sql`, `)}]`,
      sql`EXISTS (
        SELECT 1 FROM ${listingDenominations}
        INNER JOIN ${denominations} ON ${denominations.id} = ${listingDenominations.denominationId}
        WHERE ${listingDenominations.listingId} = ${listings.id}
          AND ${denominations.slug} IN (${sql.join(slugs.map((slug) => sql`${slug}`), sql`, `)})
      )`,
    )!);
  }

  if (filters.industry?.length) {
    const slugs = [...new Set(filters.industry.map((value) => canonicalIndustrySlug(value) ?? value).slice(0, 12))];
    conditions.push(or(
      inArray(listings.industrySlug, slugs),
      sql`EXISTS (
        SELECT 1 FROM ${listingIndustries}
        INNER JOIN ${industries} ON ${industries.id} = ${listingIndustries.industryId}
        WHERE ${listingIndustries.listingId} = ${listings.id} AND ${industries.slug} IN (${sql.join(slugs.map((slug) => sql`${slug}`), sql`, `)})
      )`,
      sql`EXISTS (
        SELECT 1 FROM ${listingProfessions}
        INNER JOIN ${professions} ON ${professions.id} = ${listingProfessions.professionId}
        WHERE ${listingProfessions.listingId} = ${listings.id} AND ${professions.industryId} IN (
          SELECT ${industries.id} FROM ${industries} WHERE ${industries.slug} IN (${sql.join(slugs.map((slug) => sql`${slug}`), sql`, `)})
        )
      )`,
      sql`EXISTS (
        SELECT 1 FROM ${listingProfessions}
        INNER JOIN ${professions} ON ${professions.id} = ${listingProfessions.professionId}
        INNER JOIN ${industryCategories} ON ${industryCategories.id} = ${professions.categoryId}
        WHERE ${listingProfessions.listingId} = ${listings.id} AND ${industryCategories.industryId} IN (
          SELECT ${industries.id} FROM ${industries} WHERE ${industries.slug} IN (${sql.join(slugs.map((slug) => sql`${slug}`), sql`, `)})
        )
      )`,
      sql`EXISTS (
        SELECT 1 FROM ${industryCategories}
        WHERE ${industryCategories.industryId} IN (
          SELECT ${industries.id} FROM ${industries} WHERE ${industries.slug} IN (${sql.join(slugs.map((slug) => sql`${slug}`), sql`, `)})
        ) AND (${industryCategories.slug} = ${listings.categorySlug}
          OR ${industryCategories.aliases}::text ILIKE '%' || ${listings.categorySlug} || '%')
      )`,
    )!);
  }

  if (filters.profession?.length) {
    const slugs = [...new Set(filters.profession.map((value) => canonicalProfessionSlug(value) ?? value).slice(0, 12))];
    conditions.push(or(
      sql`EXISTS (
        SELECT 1 FROM ${listingProfessions}
        INNER JOIN ${professions} ON ${professions.id} = ${listingProfessions.professionId}
        WHERE ${listingProfessions.listingId} = ${listings.id} AND ${professions.slug} IN (${sql.join(slugs.map((slug) => sql`${slug}`), sql`, `)})
      )`,
      ...filters.profession.slice(0, 12).map((value) => sql`${listings.customProfessions}::text ILIKE ${like(value)}`),
    )!);
  }

  if (filters.category?.length) {
    const target = filters.category.map((slug) => categoryBySlug(slug)?.category.slug ?? slug).slice(0, 12);
    conditions.push(or(
      inArray(listings.categorySlug, target),
      sql`EXISTS (
        SELECT 1 FROM ${listingProfessions}
        INNER JOIN ${professions} ON ${professions.id} = ${listingProfessions.professionId}
        INNER JOIN ${industryCategories} ON ${industryCategories.id} = ${professions.categoryId}
        WHERE ${listingProfessions.listingId} = ${listings.id} AND ${industryCategories.slug} IN (${sql.join(target.map((slug) => sql`${slug}`), sql`, `)})
      )`,
    )!);
  }

  for (const service of (filters.service ?? []).slice(0, 12)) conditions.push(existsService(like(service)));

  if (filters.city) conditions.push(existsLocation(ilike(listingLocations.city, like(filters.city))));
  if (filters.region) conditions.push(existsLocation(ilike(listingLocations.region, filters.region)));
  if (filters.postal) conditions.push(sql`${listings.showAddress} = true AND ${existsLocation(ilike(listingLocations.postalCode, like(filters.postal)))}`);

  const near = filters.near?.trim();
  if (near) {
    const resolved = resolveLocation(near);
    if (resolved?.city) {
      conditions.push(existsLocation(and(
        ilike(listingLocations.city, resolved.city.city),
        ilike(listingLocations.region, resolved.city.region),
      )!));
    } else if (resolved?.state) {
      conditions.push(existsLocation(ilike(listingLocations.region, resolved.state.abbr)));
    } else {
      const tokens = near.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter((x) => x.length > 1).slice(0, 6);
      for (const token of tokens) {
        const pattern = like(token);
        conditions.push(existsLocation(or(
          ilike(listingLocations.city, pattern),
          ilike(listingLocations.region, pattern),
          ilike(listingLocations.country, pattern),
          sql`${listings.showAddress} = true AND ${listingLocations.postalCode} ILIKE ${pattern}`,
        )!));
      }
    }
  }

  if (filters.onlineOnly) conditions.push(or(
    eq(listings.isOnlineOnly, true),
    sql`EXISTS (
      SELECT 1 FROM ${listingHashtags}
      INNER JOIN ${hashtags} ON ${hashtags.id} = ${listingHashtags.hashtagId}
      WHERE ${listingHashtags.listingId} = ${listings.id} AND lower(${hashtags.tag}) = 'onlineservices'
    )`,
  )!);

  if (filters.openNow) {
    // The listing schema stores owner-entered hours as prose and has no time-zone
    // field. We therefore only return an unambiguous subset: records explicitly
    // marked open 24 hours, rather than implying a local-time calculation.
    conditions.push(sql`EXISTS (
      SELECT 1 FROM jsonb_each_text(COALESCE(${listings.hours}, '{}'::jsonb)) AS hours_entry(day, hours_text)
      WHERE hours_entry.hours_text ~* '24[ -]?hours?|24h'
    )`);
  }

  if (filters.verifiedOnly) {
    // No public verification desk is currently available. Do not surface a
    // listing as "verified" based only on legacy timestamp/badge fields.
    conditions.push(sql`false`);
  }
  if (filters.minRating) conditions.push(sql`COALESCE(${listings.avgRating}, '0')::numeric >= ${filters.minRating}`);
  if (filters.price?.length) conditions.push(inArray(listings.priceRange, filters.price.slice(0, 8)));
  for (const value of (filters.languages ?? []).slice(0, 12)) {
    conditions.push(sql`${listings.languages} @> ${JSON.stringify([value])}::jsonb`);
  }
  for (const value of (filters.accessibility ?? []).slice(0, 12)) {
    conditions.push(sql`EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(COALESCE(${listings.accessibility}, '[]'::jsonb)) AS accessibility_value(value)
      WHERE accessibility_value.value ILIKE ${like(value)}
    )`);
  }

  if (typeof filters.lat === 'number' && typeof filters.lng === 'number') {
    const distance = sql`3958.7613 * 2 * asin(sqrt(
      power(sin(radians(((${listingLocations.latitude})::double precision - ${filters.lat}) / 2)), 2)
      + cos(radians(${filters.lat})) * cos(radians((${listingLocations.latitude})::double precision))
      * power(sin(radians(((${listingLocations.longitude})::double precision - ${filters.lng}) / 2)), 2)
    ))`;
    const geo = existsLocation(and(
      sql`${listingLocations.latitude} IS NOT NULL AND ${listingLocations.longitude} IS NOT NULL`,
      sql`${distance} <= ${filters.radiusMi ?? 25}`,
    )!);
    conditions.push(or(eq(listings.isOnlineOnly, true), geo)!);
  }

  return conditions;
}

function searchLogQuery(raw: string): string | null {
  const cleaned = raw.trim()
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, '[url]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[number]')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 180);
  return cleaned || null;
}

async function recordSearch(filters: PublicSearchFilters, resultCount: number, tags: string[]): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    const query = searchLogQuery(filters.q ?? '');
    const safeFilters: Record<string, unknown> = {
      typeCount: filters.type?.length ?? 0,
      denominationCount: filters.denomination?.length ?? 0,
      industryCount: filters.industry?.length ?? 0,
      professionCount: filters.profession?.length ?? 0,
      categoryCount: filters.category?.length ?? 0,
      serviceCount: filters.service?.length ?? 0,
      hasLocation: Boolean(filters.near || filters.city || filters.region || filters.lat !== undefined),
      onlineOnly: Boolean(filters.onlineOnly),
      sort: filters.sort ?? 'relevance',
    };
    await db.insert(searchLogs).values({ query, hashtags: tags.slice(0, 12), filters: safeFilters, resultCount });
    searchEventsSincePrune += 1;
    if (searchEventsSincePrune % 256 === 0) {
      try {
        const retentionCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        await db.delete(searchLogs).where(sql`${searchLogs.createdAt} < ${retentionCutoff}`);
      } catch (cleanupError) {
        console.error('[search-analytics] retention cleanup failed', { message: cleanupError instanceof Error ? cleanupError.message : String(cleanupError) });
      }
    }
  } catch (error) {
    console.error('[search-analytics] failed to record search', { message: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Search the published corpus in Postgres. Filtering, counting, sorting and
 * offset pagination happen before only the requested IDs are hydrated.
 */
export async function searchPublishedListings(filters: PublicSearchFilters, requestId?: string): Promise<SearchResult> {
  // Bundled listings are an explicitly gated developer/demo-only feature. Keep
  // them out of normal directory traffic; a configured but unavailable DB is an error,
  // never a reason to fall back to a corpus-wide in-memory production search.
  const db = getDb();
  if (!db) {
    if (hasDatabase()) throw new Error('Configured database client is unavailable.');
    return searchListings(filters);
  }
  // The explicit non-production demo flag keeps the historical mixed corpus for
  // local previews. It cannot be enabled on production through includeSamples().
  if (includeSamples()) return searchListings(filters, await getDbListings());

  const parsed = parseQuery(filters.q ?? '');
  const term = parsed.text.replace(/\bnear\s+me\b/gi, ' ').replace(/\s+/g, ' ').trim();
  const conditions = buildConditions(filters, term, parsed.tags);
  const where = and(...conditions)!;
  const limit = Math.min(50, Math.max(1, Math.floor(filters.perPage ?? 12)));
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const offset = Math.min(500_000, (page - 1) * limit);
  const rank = term
    ? sql<number>`ts_rank(COALESCE(search_vector, ''::tsvector), websearch_to_tsquery('english', ${term}))`
    : sql<number>`0`;
  const recentSortNow = new Date();
  const recentSortCutoff = new Date(recentSortNow.getTime() - RECENTLY_UPDATED_WINDOW_MS);

  const order = filters.sort === 'rating'
    ? [desc(sql`COALESCE(${listings.avgRating}, '0')::numeric`), desc(listings.reviewCount)]
    : filters.sort === 'featured'
      ? [desc(listings.featuredRank), desc(sql`COALESCE(${listings.avgRating}, '0')::numeric`), desc(listings.publishedAt)]
      : filters.sort === 'popular'
        ? [desc(listings.viewCount), desc(listings.publishedAt)]
        : filters.sort === 'recommended'
          ? [desc(listings.recommendationCount), desc(listings.publishedAt)]
        : filters.sort === 'recently-updated'
          ? [
            sql`CASE WHEN ${listings.recentlyUpdatedAt} > ${recentSortCutoff} AND ${listings.recentlyUpdatedAt} < ${recentSortNow} THEN 0 ELSE 1 END ASC`,
            sql`CASE WHEN ${listings.recentlyUpdatedAt} > ${recentSortCutoff} AND ${listings.recentlyUpdatedAt} < ${recentSortNow} THEN ${listings.recentlyUpdatedAt} ELSE NULL END DESC NULLS LAST`,
            desc(listings.publishedAt),
          ]
          : filters.sort === 'newest'
            ? [desc(listings.publishedAt), desc(listings.createdAt)]
            : filters.sort === 'distance' && typeof filters.lat === 'number' && typeof filters.lng === 'number'
              ? [distanceOrder(filters.lat, filters.lng), desc(listings.publishedAt)]
              : term
                ? [desc(rank), desc(listings.featuredRank), desc(sql`COALESCE(${listings.avgRating}, '0')::numeric`)]
                : [desc(listings.featuredRank), desc(sql`COALESCE(${listings.avgRating}, '0')::numeric`), desc(listings.publishedAt)];

  const distance = typeof filters.lat === 'number' && typeof filters.lng === 'number'
    ? sql<number | null>`CASE WHEN ${listingLocations.latitude} IS NOT NULL AND ${listingLocations.longitude} IS NOT NULL THEN
        3958.7613 * 2 * asin(sqrt(
          power(sin(radians(((${listingLocations.latitude})::double precision - ${filters.lat}) / 2)), 2)
          + cos(radians(${filters.lat})) * cos(radians((${listingLocations.latitude})::double precision))
          * power(sin(radians(((${listingLocations.longitude})::double precision - ${filters.lng}) / 2)), 2)
        )) ELSE NULL END`
    : sql<null>`NULL`;

  try {
    const [rows, countRows] = await Promise.all([
      db.select({ id: listings.id, rank, distance })
        .from(listings)
        .leftJoin(listingLocations, and(eq(listingLocations.listingId, listings.id), eq(listingLocations.isPrimary, true)))
        .where(where)
        .orderBy(...order)
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(listings).where(where),
    ]);
    const total = Number(countRows[0]?.total ?? 0);
    const ids = rows.map((row) => row.id);
    const hydrated = await getDbListingsByIds(ids);
    const byId = new Map(hydrated.map((listing) => [listing.id.replace(/^db-/, ''), listing]));
    const rowMeta = new Map(rows.map((row) => [row.id, {
      rank: Number(row.rank ?? 0),
      distance: row.distance == null ? undefined : Number(row.distance),
    }]));
    const hits: SearchHit[] = ids.flatMap((id) => {
      const listing = byId.get(id);
      if (!listing) return [];
      const meta = rowMeta.get(id);
      return [{
        ...listing,
        score: meta?.rank ?? 0,
        matchedTags: parsed.tags,
        ...(meta?.distance === undefined ? {} : { distanceMiles: meta.distance }),
      }];
    });
    const result: SearchResult = {
      hits,
      total,
      page,
      perPage: limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      suggestions: buildSuggestions(filters.q ?? '', hits.length),
      appliedTags: parsed.tags,
      altLinks: buildAltLinks(filters, hits.length),
    };
    await recordSearch(filters, total, parsed.tags);
    return result;
  } catch (error) {
    console.error('[search] Postgres query failed', {
      requestId,
      message: error instanceof Error ? error.message : String(error),
      hasQuery: Boolean(term),
      filterKeys: Object.entries(filters).filter(([, value]) => Boolean(value)).map(([key]) => key),
    });
    throw error;
  }
}

function distanceOrder(lat: number, lng: number) {
  return sql`CASE WHEN ${listingLocations.latitude} IS NULL OR ${listingLocations.longitude} IS NULL THEN 1 ELSE 0 END,
    3958.7613 * 2 * asin(sqrt(
      power(sin(radians(((${listingLocations.latitude})::double precision - ${lat}) / 2)), 2)
      + cos(radians(${lat})) * cos(radians((${listingLocations.latitude})::double precision))
      * power(sin(radians(((${listingLocations.longitude})::double precision - ${lng}) / 2)), 2)
    ))`;
}

/** Bounded location options for the search page; no listing corpus hydration. */
export async function getPublicSearchLocations(limit = 80): Promise<Array<{ label: string; value: string; kind: string }>> {
  const db = getDb();
  if (!db) return [];
  try {
    const [cities, online] = await Promise.all([
      db.select({
        city: listingLocations.city,
        region: listingLocations.region,
        total: sql<number>`count(*)::int`,
      })
        .from(listingLocations)
        .innerJoin(listings, eq(listings.id, listingLocations.listingId))
        .where(and(
          eq(listings.status, 'published'), isNull(listings.deletedAt),
          eq(listingLocations.isPrimary, true),
          sql`${listingLocations.city} IS NOT NULL AND ${listingLocations.region} IS NOT NULL`,
        ))
        .groupBy(listingLocations.city, listingLocations.region)
        .orderBy(desc(sql`count(*)`))
        .limit(Math.min(100, Math.max(1, limit))),
      db.select({ total: sql<number>`count(*)::int` }).from(listings)
        .where(and(eq(listings.status, 'published'), isNull(listings.deletedAt), eq(listings.isOnlineOnly, true))),
    ]);
    const choices = cities.flatMap((row) => row.city && row.region ? [{
      label: `${row.city.trim()}, ${row.region.trim()}`,
      value: `${row.city.trim()}, ${row.region.trim()}`,
      kind: 'city',
    }] : []);
    if (Number(online[0]?.total ?? 0) > 0) choices.unshift({ label: 'Online', value: 'Online', kind: 'online' });
    return choices;
  } catch (error) {
    console.error('[search] location options query failed', { message: error instanceof Error ? error.message : String(error) });
    return [];
  }
}
