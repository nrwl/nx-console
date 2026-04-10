import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const MARKER_DIR = join(tmpdir(), 'vscode-e2e-test-server');

export function getMarkerId(workerIndex: number): string {
  return `worker-${workerIndex}`;
}

export function getMarkerFilePath(markerId: string): string {
  return join(MARKER_DIR, `${markerId}.url`);
}

export function getCommandPaletteShortcut(
  platform: NodeJS.Platform = process.platform,
): string {
  return platform === 'darwin' ? 'Meta+Shift+P' : 'Control+Shift+P';
}

export function getWorkerDisplay(workerIndex: number): string {
  return `:${99 + workerIndex}`;
}
