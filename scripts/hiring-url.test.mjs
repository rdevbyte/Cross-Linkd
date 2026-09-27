import test from 'node:test';
import assert from 'node:assert/strict';
import { careersUrlError } from '../src/lib/hiringUrl.mjs';

test('empty careers URL is optional', () => {
  assert.equal(careersUrlError(''), null);
  assert.equal(careersUrlError('   '), null);
  assert.equal(careersUrlError(undefined), null);
});

test('accepts http and https URLs', () => {
  assert.equal(careersUrlError('https://example.com/careers'), null);
  assert.equal(careersUrlError('http://jobs.example.org/openings'), null);
  assert.equal(careersUrlError('  https://example.com/jobs?team=ops  '), null);
});

test('rejects invalid careers URLs', () => {
  assert.ok(careersUrlError('example.com/careers'));
  assert.ok(careersUrlError('ftp://example.com/jobs'));
  assert.ok(careersUrlError('javascript:alert(1)'));
  assert.ok(careersUrlError('http://'));
  assert.ok(careersUrlError('not a url'));
});
