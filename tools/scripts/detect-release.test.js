const { test } = require('node:test');
const assert = require('node:assert');
const { detectRelease } = require('./detect-release.js');

// `commitSubjects` is ordered newest-first, as produced by `git log --format=%s`.

test('detects a release commit for the matching package', () => {
  const subjects = [
    'Merge pull request #100 from nrwl/release-2026-05-19',
    'chore(release-vscode): 18.100.3',
    'Merge branch master into release',
    'fix: some bug (#3142)',
  ];
  assert.deepStrictEqual(detectRelease(subjects, 'vscode'), {
    shouldPublish: true,
    version: '18.100.3',
  });
});

test('ignores release commits for other packages', () => {
  assert.deepStrictEqual(
    detectRelease(['chore(release-nxls): 1.12.0'], 'vscode'),
    {
      shouldPublish: false,
      version: null,
    },
  );
});

test('returns no release when no release commit is present', () => {
  const subjects = ['fix: a bug', 'Merge branch master into release'];
  assert.deepStrictEqual(detectRelease(subjects, 'nx-mcp'), {
    shouldPublish: false,
    version: null,
  });
});

test('handles the [skip ci] suffix in the commit message', () => {
  assert.deepStrictEqual(
    detectRelease(['chore(release-nx-mcp): 0.26.0 [skip ci]'], 'nx-mcp'),
    { shouldPublish: true, version: '0.26.0' },
  );
});

test('uses the newest matching commit when multiple are present', () => {
  const subjects = [
    'chore(release-vscode): 18.100.4',
    'chore(release-vscode): 18.100.3',
  ];
  assert.deepStrictEqual(detectRelease(subjects, 'vscode'), {
    shouldPublish: true,
    version: '18.100.4',
  });
});

test('matches the nx-mcp package name literally (hyphen is not a wildcard)', () => {
  assert.deepStrictEqual(
    detectRelease(['chore(release-nxYmcp): 1.0.0'], 'nx-mcp'),
    {
      shouldPublish: false,
      version: null,
    },
  );
});
