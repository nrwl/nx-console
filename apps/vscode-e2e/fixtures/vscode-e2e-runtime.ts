import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const MARKER_DIR = join(tmpdir(), 'vscode-e2e-test-server');
export const MARKER_ENV_VAR = 'NX_CONSOLE_E2E_MARKER_ID';
export const PLAYWRIGHT_PARALLEL_INDEX_ENV_VAR = 'TEST_PARALLEL_INDEX';
export const MARKER_ARG_PREFIX = '--nx-console-e2e-marker-id=';

export function getMarkerId(parallelIndex: number): string {
  return `worker-${parallelIndex}`;
}

export function getMarkerIdFromParallelIndexEnv(
  env: NodeJS.ProcessEnv,
): string | undefined {
  const parallelIndexValue = env[PLAYWRIGHT_PARALLEL_INDEX_ENV_VAR];
  if (parallelIndexValue === undefined) {
    return undefined;
  }

  const parallelIndex = Number.parseInt(parallelIndexValue, 10);
  if (!Number.isInteger(parallelIndex) || parallelIndex < 0) {
    return undefined;
  }

  return getMarkerId(parallelIndex);
}

export function getMarkerIdFromArgv(
  argv: readonly string[],
): string | undefined {
  const markerArg = argv.find((arg) => arg.startsWith(MARKER_ARG_PREFIX));
  if (!markerArg) {
    return undefined;
  }

  const markerId = markerArg.slice(MARKER_ARG_PREFIX.length);
  return markerId.length > 0 ? markerId : undefined;
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
