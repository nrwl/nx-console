import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export const MARKER_DIR = join(tmpdir(), 'vscode-e2e-test-server');
export const DEFAULT_VSCODE_VERSION = '1.137.0';
export const EXTENSION_ID = 'nrwl.angular-console';

export interface ScreencastFrame {
  file: string;
  timestamp: number;
}

export function getMarkerFilePath(markerId: string): string {
  return join(MARKER_DIR, `${markerId}.url`);
}

export function getCommandPaletteShortcut(
  platform: NodeJS.Platform = process.platform,
): string {
  return platform === 'darwin' ? 'Meta+Shift+P' : 'Control+Shift+P';
}

export function isEnabled(value: string | undefined): boolean {
  return value === '1' || value === 'true';
}

export function resolveVSCodeExecutable(downloadedPath: string): string {
  if (existsSync(downloadedPath)) return downloadedPath;
  // Newer macOS bundles renamed Electron to Code; older downloaders return the old name.
  const codePath = join(dirname(downloadedPath), 'Code');
  if (existsSync(codePath)) return codePath;
  throw new Error(`VS Code executable does not exist: ${downloadedPath}`);
}

export function validateLabel(label: string): string {
  if (!/^[\w.-]+$/.test(label)) {
    throw new Error(
      `NX_AUTOMATION_LABEL "${label}" may only contain letters, numbers, dots, underscores and hyphens`,
    );
  }
  return label;
}

export function getMarketplaceVsixUrl(version: string): string {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(
      `Nx Console version must be an exact release such as 18.101.1, got "${version}"`,
    );
  }
  return `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/nrwl/vsextensions/angular-console/${version}/vspackage`;
}

export function parseDevToolsUrl(output: string): string | undefined {
  return /DevTools listening on (ws:\/\/\S+)/.exec(output)?.[1];
}

/**
 * Chromium only emits a screencast frame when the page changes, so each frame
 * is held until the next one (or the end of the recording) to keep real time.
 */
export function createConcatList(
  frames: ScreencastFrame[],
  endTimestamp: number,
): string {
  if (frames.length === 0) throw new Error('No screencast frames to encode');
  const lines = ['ffconcat version 1.0'];
  frames.forEach((frame, index) => {
    const next = frames[index + 1]?.timestamp ?? endTimestamp;
    lines.push(
      `file '${frame.file}'`,
      `duration ${Math.max(next - frame.timestamp, 0.04).toFixed(3)}`,
    );
  });
  // The concat demuxer ignores the duration of the final entry unless it is repeated.
  lines.push(`file '${frames[frames.length - 1].file}'`);
  return `${lines.join('\n')}\n`;
}
