const { test } = require('node:test');
const assert = require('node:assert');
const { isAllowedReleaseBranch } = require('./ensure-release-branch.js');

test('allows the release branch', () => {
  assert.strictEqual(isAllowedReleaseBranch('release'), true);
});

test('allows release-prefixed branches', () => {
  assert.strictEqual(isAllowedReleaseBranch('release-2026-05-19'), true);
});

test('rejects master', () => {
  assert.strictEqual(isAllowedReleaseBranch('master'), false);
});

test('rejects feature branches', () => {
  assert.strictEqual(isAllowedReleaseBranch('feature/foo'), false);
});

test('rejects "releases" (no hyphen separator)', () => {
  assert.strictEqual(isAllowedReleaseBranch('releases'), false);
});
