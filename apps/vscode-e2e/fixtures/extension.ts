import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { workspaceRoot } from 'nx/src/devkit-exports';
import { getMarketplaceVsixUrl } from './vscode-e2e-runtime';

export interface ExtensionInfo {
  path: string;
  source: 'workspace' | 'directory' | 'vsix' | 'marketplace';
  version: string;
  mainSha256?: string;
}

const EXTENSIONS_DIR = join(workspaceRoot, 'dist/apps/vscode-e2e/extensions');

/**
 * Selects the Nx Console build under test: this worktree's build by default,
 * a released version from the Marketplace, or a given VSIX or extension directory.
 */
export async function resolveExtension(
  env: NodeJS.ProcessEnv = process.env,
): Promise<ExtensionInfo> {
  const version = env.VSCODE_E2E_EXTENSION_VERSION || undefined;
  const path = env.VSCODE_E2E_EXTENSION_PATH || undefined;
  if (version && path) {
    throw new Error(
      'Set either VSCODE_E2E_EXTENSION_VERSION or VSCODE_E2E_EXTENSION_PATH, not both',
    );
  }
  if (version) {
    const vsix = join(EXTENSIONS_DIR, `nrwl.angular-console-${version}.vsix`);
    if (!existsSync(vsix)) {
      await downloadVsix(getMarketplaceVsixUrl(version), vsix);
    }
    return describeExtension(extractVsix(vsix), 'marketplace');
  }
  if (path?.endsWith('.vsix')) {
    return describeExtension(extractVsix(resolve(path)), 'vsix');
  }
  if (path) {
    return describeExtension(resolve(path), 'directory');
  }
  return describeExtension(
    join(workspaceRoot, 'dist/apps/vscode'),
    'workspace',
  );
}

async function downloadVsix(url: string, destination: string): Promise<void> {
  const response = await fetch(url, { signal: AbortSignal.timeout(180_000) });
  if (!response.ok) {
    throw new Error(`Downloading ${url} failed with HTTP ${response.status}`);
  }
  let data: Buffer = Buffer.from(await response.arrayBuffer());
  // The Marketplace can serve the package gzip-compressed without a Content-Encoding header.
  if (data[0] === 0x1f && data[1] === 0x8b) {
    data = gunzipSync(data);
  }
  if (data.subarray(0, 2).toString() !== 'PK') {
    throw new Error(`${url} did not return a VSIX archive`);
  }
  mkdirSync(EXTENSIONS_DIR, { recursive: true });
  writeFileSync(destination, data);
}

function extractVsix(vsix: string): string {
  const hash = sha256(vsix).slice(0, 12);
  const target = join(EXTENSIONS_DIR, `${basename(vsix, '.vsix')}-${hash}`);
  const extension = join(target, 'extension');
  if (!existsSync(join(extension, 'package.json'))) {
    rmSync(target, { recursive: true, force: true });
    mkdirSync(target, { recursive: true });
    execFileSync('unzip', ['-q', vsix, '-d', target], { stdio: 'pipe' });
  }
  return extension;
}

function describeExtension(
  path: string,
  source: ExtensionInfo['source'],
): ExtensionInfo {
  const packageJsonPath = join(path, 'package.json');
  if (!existsSync(packageJsonPath)) {
    throw new Error(
      `No VS Code extension at ${path}${source === 'workspace' ? '. Build it with yarn nx run vscode:build.' : ''}`,
    );
  }
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const main = join(path, packageJson.main ?? 'main.js');
  return {
    path,
    source,
    version: packageJson.version,
    mainSha256: existsSync(main) ? sha256(main) : undefined,
  };
}

function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}
