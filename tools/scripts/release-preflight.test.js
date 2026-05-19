const { test } = require('node:test');
const assert = require('node:assert');
const { getPreflightErrors } = require('./release-preflight.js');

test('passes on latest master with a clean working tree', () => {
  assert.deepStrictEqual(
    getPreflightErrors({
      branch: 'master',
      uncommittedFileCount: 0,
      behindCount: 0,
    }),
    [],
  );
});

test('blocks a release from a non-master branch', () => {
  const errors = getPreflightErrors({
    branch: 'release-2026-05-19',
    uncommittedFileCount: 0,
    behindCount: 0,
  });
  assert.strictEqual(errors.length, 1);
  assert.match(errors[0], /must run from 'master'/);
});

test('blocks a release with uncommitted changes', () => {
  const errors = getPreflightErrors({
    branch: 'master',
    uncommittedFileCount: 3,
    behindCount: 0,
  });
  assert.strictEqual(errors.length, 1);
  assert.match(errors[0], /uncommitted change/);
});

test('blocks a release when master is behind origin', () => {
  const errors = getPreflightErrors({
    branch: 'master',
    uncommittedFileCount: 0,
    behindCount: 2,
  });
  assert.strictEqual(errors.length, 1);
  assert.match(errors[0], /behind 'origin\/master'/);
});

test('reports every problem at once', () => {
  const errors = getPreflightErrors({
    branch: 'feature/foo',
    uncommittedFileCount: 1,
    behindCount: 5,
  });
  assert.strictEqual(errors.length, 3);
});
