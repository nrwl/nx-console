import { Logger } from '@nx-console/shared-utils';
import type {
  PackageManager,
  PackageManagerCommands,
} from 'nx/src/utils/package-manager';
import { importNxPackagePath } from '../workspace-dependencies';

export async function detectPackageManager(
  workspacePath: string,
  logger?: Logger,
): Promise<PackageManager> {
  const { detectPackageManager } = await importNxPackagePath<
    typeof import('nx/src/utils/package-manager')
  >(workspacePath, 'src/utils/package-manager', logger);

  return detectPackageManager(workspacePath);
}

export async function getPackageManagerVersion(
  packageManager: PackageManager,
  workspacePath: string,
  logger?: Logger,
): Promise<string> {
  const { getPackageManagerVersion } = await importNxPackagePath<
    typeof import('nx/src/utils/package-manager')
  >(workspacePath, 'src/utils/package-manager', logger);

  return getPackageManagerVersion(packageManager, workspacePath);
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
      getRegistryUrl: 'npm config get registry',
    };
  }
}
