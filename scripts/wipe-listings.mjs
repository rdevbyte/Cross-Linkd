/**
 * Wipe all business listings (and their child rows) — start from a clean slate.
 * Users, accounts, and sessions are NOT touched. Taxonomy (industries etc.) stays.
 *
 * Usage:  npm run db:wipe-listings        (reads DATABASE_URL / DIRECT_URL, also from .env)
 */
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

// Minimal .env loader so this works with `npm run` on any OS without extra deps.
try {
  for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* no .env file — rely on real env vars */ }

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('No database URL found. Set DATABASE_URL (or DIRECT_URL) in .env or the environment.');
  process.exit(1);
}

const client = new Client({ connectionString: url });
await client.connect();
try {
  const before = (await client.query('select count(*)::int as n from listings')).rows[0].n;
  // CASCADE also truncates every table that references listings
  // (locations, taxonomy links, favorites, moderation actions…).
  await client.query('TRUNCATE listings CASCADE');
  const after = (await client.query('select count(*)::int as n from listings')).rows[0].n;
  console.log(`Removed ${before} listing(s). Listings remaining: ${after}.`);
  console.log('Users, accounts, and sessions were not touched.');
  console.log('Bundled demo business listings have been removed; this wipe only affects database rows.');
} finally {
  await client.end();
}
