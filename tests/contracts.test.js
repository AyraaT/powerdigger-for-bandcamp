import test from 'node:test';
import assert from 'node:assert/strict';

await import('../shared/contracts.js');

test('PD_CONTRACTS.MSG exposes required message keys', () => {
  const { MSG } = globalThis.PD_CONTRACTS;

  const expected = [
    'OPTIONS',
    'BACKUP_DOWNLOAD',
    'PERM_CHECK_EXTENSIONS',
    'PERM_CHECK_HISTORY',
    'TRACK_GET_COUNT',
    'TRACK_PLAY',
    'HISTORY_CHECK_BATCH',
    'HISTORY_CHECK',
    'BMC_VALIDATE',
    'FAN_PAGE',
  ];

  expected.forEach((key) => {
    assert.ok(Object.prototype.hasOwnProperty.call(MSG, key), `missing MSG key: ${key}`);
    assert.equal(typeof MSG[key], 'string', `MSG.${key} should be a string`);
    assert.ok(MSG[key].length > 0, `MSG.${key} should not be empty`);
  });
});
