import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isListingClaimable } from '../src/lib/listingManagement.mjs';

const liveUnowned = { status: 'published', deletedAt: null, ownerId: null, isClaimed: false };

test('only live, unowned, unclaimed listings are claimable', () => {
  assert.equal(isListingClaimable(liveUnowned), true);
  assert.equal(isListingClaimable({ ...liveUnowned, ownerId: 'account-1' }), false, 'owner-posted listings cannot be claimed by others');
  assert.equal(isListingClaimable({ ...liveUnowned, isClaimed: true }), false);
  assert.equal(isListingClaimable({ ...liveUnowned, status: 'draft' }), false);
  assert.equal(isListingClaimable({ ...liveUnowned, deletedAt: new Date() }), false);
});

test('claim options and details only link to claimable listings; POST rechecks eligibility', async () => {
  const [helper, claimPage, claimApi, detail] = await Promise.all([
    readFile(new URL('../src/lib/listingManagement.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/claim-listing.astro', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/api/claims.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/directory/[slug].astro', import.meta.url), 'utf8'),
  ]);
  assert.match(helper, /!listing\.ownerId/);
  assert.match(claimPage, /corpus\.filter\(\(l\) => l\.claimable === true\)/);
  assert.match(claimPage, /claimableListings\.map/);
  assert.match(claimApi, /isNull\(listings\.ownerId\)/);
  assert.match(claimApi, /eq\(listings\.isClaimed, false\)/);
  assert.match(claimApi, /eq\(listings\.status, 'published'\)/);
  assert.match(detail, /canClaimListing &&/);
});

test('owner edit/delete actions are clearly labeled and DELETE is atomically owner-scoped', async () => {
  const [api, dashboard] = await Promise.all([
    readFile(new URL('../src/pages/api/listings/[id].ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/dashboard/listings.astro', import.meta.url), 'utf8'),
  ]);
  assert.match(api, /function loadOwned\(id: string, userId: string\)[\s\S]*eq\(listings\.ownerId, userId\)/);
  assert.match(api, /db\.delete\(listings\)[\s\S]*eq\(listings\.id, id\), eq\(listings\.ownerId, locals\.user!\.id\)/);
  assert.match(dashboard, /aria-label=\{`Edit \$\{r\.name\}`\}/);
  assert.match(dashboard, /aria-label=\{`Permanently delete \$\{r\.name\}`\}/);
  assert.match(dashboard, /Permanently delete “\$\{name\}”\?[\s\S]*This cannot be undone\./);
});
