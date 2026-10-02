import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  createConcatList,
  getCommandPaletteShortcut,
  getMarkerFilePath,
  getMarketplaceVsixUrl,
  parseDevToolsUrl,
  resolveVSCodeExecutable,
  validateLabel,
} from './vscode-e2e-runtime.ts';

test('marker files are unique per marker id', () => {
  assert.notEqual(getMarkerFilePath('a'), getMarkerFilePath('b'));
});

test('command palette shortcut matches host platform conventions', () => {
  assert.equal(getCommandPaletteShortcut('darwin'), 'Meta+Shift+P');
  assert.equal(getCommandPaletteShortcut('linux'), 'Control+Shift+P');
  assert.equal(getCommandPaletteShortcut('win32'), 'Control+Shift+P');
});

test('resolves the renamed macOS binary, keeps the legacy binary and rejects missing installs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vscode-binary-test-'));
  try {
    const legacy = join(dir, 'Electron');
    assert.throws(() => resolveVSCodeExecutable(legacy), /does not exist/);
    writeFileSync(join(dir, 'Code'), '');
    assert.equal(resolveVSCodeExecutable(legacy), join(dir, 'Code'));
    writeFileSync(legacy, '');
    assert.equal(resolveVSCodeExecutable(legacy), legacy);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('labels must be usable as directory names', () => {
  assert.equal(validateLabel('issue-3193-repro'), 'issue-3193-repro');
  assert.equal(validateLabel('nx-console-18.101.1'), 'nx-console-18.101.1');
  assert.throws(() => validateLabel('../escape'), /NX_AUTOMATION_LABEL/);
  assert.throws(() => validateLabel('with space'), /NX_AUTOMATION_LABEL/);
});

test('marketplace downloads require an exact release', () => {
  assert.equal(
    getMarketplaceVsixUrl('18.101.1'),
    'https://marketplace.visualstudio.com/_apis/public/gallery/publishers/nrwl/vsextensions/angular-console/18.101.1/vspackage',
  );
  assert.throws(() => getMarketplaceVsixUrl('latest'), /exact release/);
});

test('finds the DevTools endpoint in VS Code startup output', () => {
  assert.equal(
    parseDevToolsUrl(
      'Warning\nDevTools listening on ws://127.0.0.1:53811/devtools/browser/5b1f\n',
    ),
    'ws://127.0.0.1:53811/devtools/browser/5b1f',
  );
  assert.equal(parseDevToolsUrl('DevTools listening on'), undefined);
});

test('screencast frames keep their capture timing', () => {
  assert.equal(
    createConcatList(
      [
        { file: '000000.jpg', timestamp: 10 },
        { file: '000001.jpg', timestamp: 10.5 },
        { file: '000002.jpg', timestamp: 10.51 },
      ],
      12,
    ),
    [
      'ffconcat version 1.0',
      "file '000000.jpg'",
      'duration 0.500',
      "file '000001.jpg'",
      'duration 0.040',
      "file '000002.jpg'",
      'duration 1.490',
      "file '000002.jpg'",
      '',
    ].join('\n'),
  );
  assert.throws(() => createConcatList([], 1), /No screencast frames/);
});
