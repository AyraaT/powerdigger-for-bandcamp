import test from 'node:test';
import assert from 'node:assert/strict';

await import('../shared/urlBuilder.js');

test('createSearchToken encodes and joins terms', () => {
  const token = globalThis.pdUrlBuilder.createSearchToken('A&B # c/d');
  assert.equal(token, 'A+B+c+d');
});
