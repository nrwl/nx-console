import { Logger } from '@nx-console/shared-utils';
import type {
  PackageManager,
  PackageManagerCommands,
} from 'nx/src/utils/package-manager';
import { importNxPackagePath } from '../workspace-dependencies';
import { readNxJson } from '../nx-json';
import { existsSync } from 'fs';
import { join } from 'path';

export async function detectPackageManager(
  workspacePath: string,
  logger?: Logger,
): Promise<PackageManager> {
  try {
    const { detectPackageManager } = await importNxPackagePath<
      typeof import('nx/src/utils/package-manager')
    >(workspacePath, 'src/utils/package-manager', logger);

    return detectPackageManager(workspacePath);
  } catch (e) {
    logger?.log(`Error detecting package manager: ${JSON.stringify(e)}`);
  }

  // fallback logic
  try {
    const nxJson = await readNxJson(workspacePath);
    return (
      nxJson.cli?.packageManager ??
      (existsSync(join(workspacePath, 'bun.lockb')) ||
      existsSync(join(workspacePath, 'bun.lock'))
        ? 'bun'
        : existsSync(join(workspacePath, 'yarn.lock'))
          ? 'yarn'
          : existsSync(join(workspacePath, 'pnpm-lock.yaml'))
            ? 'pnpm'
            : 'npm')
    );
  } catch (e) {
    // return npm by default
    return 'npm';
  }
}

export async function getPackageManagerVersion(
  packageManager: PackageManager,
  workspacePath: string,
  logger?: Logger,
): Promise<string | null> {
  try {
    const { getPackageManagerVersion } = await importNxPackagePath<
      typeof import('nx/src/utils/package-manager')
    >(workspacePath, 'src/utils/package-manager', logger);

    return getPackageManagerVersion(packageManager, workspacePath);
  } catch (e) {
    logger?.log(`Error getting package manager version: ${JSON.stringify(e)}`);

    return null;
  }
}
export async function getPackageManagerCommand(
  workspacePath: string,
  logger?: Logger,
): Promise<PackageManagerCommands> {
  try {
    const { detectPackageManager, getPackageManagerCommand } =
      await importNxPackagePath<typeof import('nx/src/utils/package-manager')>(
        workspacePath,
        'src/utils/package-manager',
        logger,
      );

    return getPackageManagerCommand(detectPackageManager(workspacePath));
  } catch (e) {
    logger?.log(`Error getting package manager command: ${JSON.stringify(e)}`);

    // return npm by default
    return {
      install: 'npm install',
      ciInstall: 'npm ci --legacy-peer-deps',
      updateLockFile: 'npm install --package-lock-only',
      add: 'npm install',
      addDev: 'npm install -D',
      rm: 'npm rm',
      exec: 'npx',
      dlx: 'npx',
      run: (script: any, args: any) =>
        `npm run ${script}${args ? ' -- ' + args : ''}`,
      list: 'npm ls',
      why: 'npm explain',
      getRegistryUrl: 'npm config get registry',
      publish: (packageRoot, registry, registryConfigKey, tag) =>
        `npm publish "${packageRoot}" --json --"${registryConfigKey}=${registry}" --tag=${tag}`,
    };
  }
}
