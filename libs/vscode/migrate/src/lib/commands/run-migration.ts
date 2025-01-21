import { importNxPackagePath } from '@nx-console/shared-npm';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { getOutputChannel } from '@nx-console/vscode-output-channels';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import type { GeneratedMigrationDetails } from 'nx/src/config/misc-interfaces';
import { join, relative } from 'path';
import { window, ProgressLocation } from 'vscode';
import { modifyMigrationsJsonMetadata } from './utils';
import { getPackageManagerCommand } from '@nx-console/shared-utils';

export async function runSingleMigration(
  migration: GeneratedMigrationDetails,
  configuration: { createCommits: boolean }
) {
  const nxWorkspacePath = getNxWorkspacePath();

  const cacheDirectoryModule = await importNxPackagePath<
    typeof import('nx/src/utils/cache-directory')
  >(nxWorkspacePath, 'src/utils/cache-directory');

  const tmpFolder =
    cacheDirectoryModule.workspaceDataDirectory ??
    cacheDirectoryModule.cacheDir;

  const tmpMigrationsJsonPath = join(
    tmpFolder,
    `migrations~${new Date().getTime()}.json`
  );

  if (!existsSync(tmpFolder)) {
    mkdirSync(tmpFolder, { recursive: true });
  }
  writeFileSync(
    tmpMigrationsJsonPath,
    JSON.stringify({ migrations: [migration] }, null, 2)
  );
  const relativePath = relative(getNxWorkspacePath(), tmpMigrationsJsonPath);
  const pm = await getPackageManagerCommand(getNxWorkspacePath());

  window.withProgress(
    {
      location: ProgressLocation.Notification,
      title: `Running ${migration.name}`,
      cancellable: false,
    },
    async () => {
      try {
        const result = execSync(
          `${pm.exec} nx migrate --runMigrations=${relativePath} ${
            configuration.createCommits ? '--createCommits' : ''
          }`,
          {
            cwd: getNxWorkspacePath(),
          }
        );

        if (result.includes(`Failed to run ${migration.name}`)) {
          modifyMigrationsJsonMetadata(
            addFailedMigration(migration.name, result.toString())
          );
        } else {
          modifyMigrationsJsonMetadata(
            addSuccessfulMigration(migration.name, result.toString())
          );
        }
      } catch (e) {
        modifyMigrationsJsonMetadata(addFailedMigration(migration.name, e));
        getOutputChannel().appendLine(e);
      }
    }
  );

  rmSync(tmpMigrationsJsonPath);
}

function addSuccessfulMigration(name: string, result: string) {
  return (migrationsJsonMetadata: any) => {
    if (!migrationsJsonMetadata.successfulMigrations) {
      migrationsJsonMetadata.successfulMigrations = [];
    }
    migrationsJsonMetadata.successfulMigrations.push({
      name: name,
      changes: result.includes('No changes were made') ? [] : ['dummy'],
    });
    return migrationsJsonMetadata;
  };
}

function addFailedMigration(name: string, error: string) {
  return (migrationsJsonMetadata: any) => {
    if (!migrationsJsonMetadata.failedMigrations) {
      migrationsJsonMetadata.failedMigrations = [];
    }
    migrationsJsonMetadata.failedMigrations.push({
      name: name,
      error,
    });
    return migrationsJsonMetadata;
  };
}
