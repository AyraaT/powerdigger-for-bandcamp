import test from 'node:test';
import assert from 'node:assert/strict';

import { computeRetryDelay, isCacheEntryFresh } from '../background/fanQueue.js';

test('computeRetryDelay uses Retry-After seconds', () => {
  const delay = computeRetryDelay('7', 2, Date.now(), () => 0);
  assert.equal(delay, 7000);
});

test('computeRetryDelay falls back to exponential backoff + jitter', () => {
  const delay = computeRetryDelay(null, 2, Date.now(), () => 123);
  assert.equal(delay, 1500 * 4 + 123);
});

test('isCacheEntryFresh returns false for stale entries', () => {
  const now = Date.now();
  const stale = { ts: now - 7 * 60 * 60 * 1000, data: {} };
  assert.equal(isCacheEntryFresh(stale, now), false);
});
