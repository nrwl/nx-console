import { importNxPackagePath } from '@nx-console/shared-npm';
import { Logger } from '@nx-console/shared-schema';
import type { PackageManagerCommands } from 'nx/src/utils/package-manager';

export async function getPackageManagerCommand(
  workspacePath: string,
  logger?: Logger
): Promise<PackageManagerCommands> {
  try {
    const { detectPackageManager, getPackageManagerCommand } =
      await importNxPackagePath<typeof import('nx/src/utils/package-manager')>(
        workspacePath,
        'src/utils/package-manager',
        logger
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
