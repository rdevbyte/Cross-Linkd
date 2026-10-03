import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (file) => readFileSync(resolve(root, file), 'utf8');
const dbUrlKeys = ['DATABASE_URL', 'POSTGRES_URL', 'POSTGRES_PRISMA_URL', 'NEON_DATABASE_URL', 'DIRECT_URL'];


test('SHOW_SAMPLE_CONTENT=1 never adds bundled business listings', async () => {
  const oldEnv = Object.fromEntries(['NODE_ENV', 'SHOW_SAMPLE_CONTENT', ...dbUrlKeys].map((key) => [key, process.env[key]]));
  process.env.NODE_ENV = 'development';
  process.env.SHOW_SAMPLE_CONTENT = '1';
  for (const key of dbUrlKeys) delete process.env[key];

  try {
    const [data, publicListings, search, dbSearch, sampleGate] = await Promise.all([
      import('../src/data/listings.ts'),
      import('../src/lib/publicListings.ts'),
      import('../src/lib/search.ts'),
      import('../src/lib/dbSearch.ts'),
      import('../src/lib/sampleGate.ts'),
    ]);

    assert.equal(sampleGate.includeSamples(), true, 'the non-production sample flag is active');
    assert.equal('SAMPLE_LISTINGS' in data, false, 'there is no bundled business-listing export');
    assert.deepEqual(await publicListings.getPublicListings(), []);
    assert.equal(await publicListings.findPublicListing('grace-and-grain-bakery'), undefined);
    assert.equal(search.searchListings({ q: 'Grace & Grain' }).total, 0);
    assert.deepEqual(search.autocompleteSuggestions('Grace'), []);
    assert.equal((await dbSearch.searchPublishedListings({ q: 'Grace & Grain' })).total, 0);
  } finally {
    for (const [key, value] of Object.entries(oldEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('listing APIs, exports, and database seed do not import demo listing records', () => {
  const paths = [
    'src/lib/publicListings.ts',
    'src/lib/search.ts',
    'src/pages/api/search.ts',
    'src/pages/api/suggest.ts',
    'src/pages/api/admin/export.ts',
    'src/pages/api/listings/export.ts',
    'src/db/seed.ts',
  ];
  for (const path of paths) {
    assert.doesNotMatch(read(path), /SAMPLE_LISTINGS/, `${path} must not reference bundled listing records`);
  }
  assert.doesNotMatch(read('src/db/seed.ts'), /insert\(schema\.listings\)/, 'db:seed must not add business rows');
});
