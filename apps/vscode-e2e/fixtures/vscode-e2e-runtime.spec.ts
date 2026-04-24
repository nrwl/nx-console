import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCommandPaletteShortcut,
  getMarkerFilePath,
  getMarkerId,
  getWorkerDisplay,
} from './vscode-e2e-runtime.ts';

test('marker ids and file paths are worker-specific', () => {
  const firstWorkerId = getMarkerId(0);
  const secondWorkerId = getMarkerId(1);

  assert.notStrictEqual(firstWorkerId, secondWorkerId);
  assert.notStrictEqual(
    getMarkerFilePath(firstWorkerId),
    getMarkerFilePath(secondWorkerId),
  );
});

test('command palette shortcut matches host platform conventions', () => {
  assert.strictEqual(getCommandPaletteShortcut('darwin'), 'Meta+Shift+P');
  assert.strictEqual(getCommandPaletteShortcut('linux'), 'Control+Shift+P');
  assert.strictEqual(getCommandPaletteShortcut('win32'), 'Control+Shift+P');
});

test('linux workers receive unique displays', () => {
  assert.strictEqual(getWorkerDisplay(0), ':99');
  assert.strictEqual(getWorkerDisplay(3), ':102');
});
