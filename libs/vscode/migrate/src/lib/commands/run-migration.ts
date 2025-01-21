import { importNxPackagePath } from '@nx-console/shared-npm';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { getOutputChannel } from '@nx-console/vscode-output-channels';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import type { GeneratedMigrationDetails } from 'nx/src/config/misc-interfaces';
import { join, relative, resolve } from 'path';
import { window, ProgressLocation } from 'vscode';
import { modifyMigrationsJsonMetadata } from './utils';
import { getPackageManagerCommand } from '@nx-console/shared-utils';
import { nxCliPath } from 'nx/src/command-line/migrate/migrate';

export async function runSingleMigration(
  migration: GeneratedMigrationDetails,
  configuration: { createCommits: boolean }
) {
  const workspacePath = getNxWorkspacePath();

  window.withProgress(
    {
      location: ProgressLocation.Notification,
      title: `Running ${migration.name}`,
    },
    async () => {
      try {
        // TODO: remove this once actual version is released
        //       the nx implementation ignores custom registries here
        process.env['NX_MIGRATE_CLI_VERSION'] = '21.0.14-local';
        const cliPath = nxCliPath(workspacePath);
        const updatedMigrateLocation = resolve(
          cliPath,
          '..',
          '..',
          'nx',
          'src',
          'command-line',
          'migrate',
          'migrate.js'
        );

        const updatedMigrateModule: typeof import('nx/src/command-line/migrate/migrate') =
          await import(updatedMigrateLocation);

        const fileChanges = await updatedMigrateModule.runNxOrAngularMigration(
          workspacePath,
          migration,
          false,
          configuration.createCommits,
          'chore: [nx migration] '
        );

        modifyMigrationsJsonMetadata(
          addSuccessfulMigration(
            migration.name,
            fileChanges.map((change) => change.path)
          )
        );
      } catch (e) {
        console.error(e);
        modifyMigrationsJsonMetadata(
          addFailedMigration(migration.name, e.message)
        );
      }
    }
  );
}

function addSuccessfulMigration(name: string, fileChanges: string[]) {
  return (migrationsJsonMetadata: any) => {
    if (!migrationsJsonMetadata.successfulMigrations) {
      migrationsJsonMetadata.successfulMigrations = [];
    }
    migrationsJsonMetadata.successfulMigrations.push({
      name: name,
      changes: fileChanges,
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
