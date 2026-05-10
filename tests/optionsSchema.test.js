import test from 'node:test';
import assert from 'node:assert/strict';

import { OPTION_DEFAULTS, normalizeOptions } from '../background/optionsSchema.js';

test('normalizeOptions applies defaults', () => {
  const options = normalizeOptions({});
  assert.equal(options.prefHistory, OPTION_DEFAULTS.prefHistory);
  assert.equal(options.prefJumpPct, OPTION_DEFAULTS.prefJumpPct);
});

test('normalizeOptions migrates prefBmcKeys when null', () => {
  const options = normalizeOptions({ prefBmcButtons: true, prefBmcKeys: null });
  assert.equal(options.prefBmcKeys, true);
});
