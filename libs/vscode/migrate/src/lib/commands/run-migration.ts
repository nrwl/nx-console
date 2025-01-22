import { MigrationsJsonMetadata } from '@nx-console/shared-types';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { nxCliPath } from 'nx/src/command-line/migrate/migrate';
import type { GeneratedMigrationDetails } from 'nx/src/config/misc-interfaces';
import type { FileChange } from 'nx/src/devkit-exports';
import { resolve } from 'path';
import { commands, ProgressLocation, window } from 'vscode';
import { modifyMigrationsJsonMetadata } from './utils';
import { execSync } from 'child_process';

export async function runSingleMigration(
  migration: GeneratedMigrationDetails,
  configuration: { createCommits: boolean }
) {
  const workspacePath = getNxWorkspacePath();

  await window.withProgress(
    {
      location: ProgressLocation.Notification,
      title: `Running ${migration.name}`,
    },
    async () => {
      try {
        modifyMigrationsJsonMetadata(addRunningMigration(migration.name));
        commands.executeCommand('nxMigrate.refreshWebview');

        const gitRefBefore = execSync('git rev-parse HEAD', {
          cwd: workspacePath,
          encoding: 'utf-8',
        }).trim();

        // TODO: remove this once actual version is released
        //       the nx implementation ignores custom registries here
        process.env['NX_MIGRATE_CLI_VERSION'] = '21.0.20-local';
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

        const gitRefAfter = execSync('git rev-parse HEAD', {
          cwd: workspacePath,
          encoding: 'utf-8',
        }).trim();

        modifyMigrationsJsonMetadata(
          addSuccessfulMigration(
            migration.name,
            fileChanges.map((change) => ({
              path: change.path,
              type: change.type,
            }))
          )
        );

        if (gitRefBefore !== gitRefAfter) {
          execSync('git add migrations.json', {
            cwd: workspacePath,
            encoding: 'utf-8',
          });
          execSync('git commit --amend --no-verify --no-edit', {
            cwd: workspacePath,
            encoding: 'utf-8',
          });
        }
      } catch (e) {
        console.error(e);
        modifyMigrationsJsonMetadata(
          addFailedMigration(migration.name, e.message)
        );
      } finally {
        modifyMigrationsJsonMetadata(removeRunningMigration(migration.name));
      }
    }
  );
}

export async function runManyMigrations(
  migrations: GeneratedMigrationDetails[],
  configuration: { createCommits: boolean }
) {
  for (const migration of migrations) {
    await runSingleMigration(migration, configuration);
  }
}

function addSuccessfulMigration(
  name: string,
  fileChanges: Omit<FileChange, 'content'>[]
) {
  return (migrationsJsonMetadata: MigrationsJsonMetadata) => {
    if (!migrationsJsonMetadata.completedMigrations) {
      migrationsJsonMetadata.completedMigrations = {};
    }
    migrationsJsonMetadata.completedMigrations[name] = {
      type: 'successful',
      name,
      changedFiles: fileChanges,
    };
    return migrationsJsonMetadata;
  };
}

function addFailedMigration(name: string, error: string) {
  return (migrationsJsonMetadata: MigrationsJsonMetadata) => {
    if (!migrationsJsonMetadata.completedMigrations) {
      migrationsJsonMetadata.completedMigrations = {};
    }
    migrationsJsonMetadata.completedMigrations[name] = {
      type: 'failed',
      name,
      error,
    };
    return migrationsJsonMetadata;
  };
}

function addRunningMigration(name: string) {
  return (migrationsJsonMetadata: MigrationsJsonMetadata) => {
    migrationsJsonMetadata.runningMigrations = [
      ...(migrationsJsonMetadata.runningMigrations ?? []),
      name,
    ];
    return migrationsJsonMetadata;
  };
}

function removeRunningMigration(name: string) {
  return (migrationsJsonMetadata: MigrationsJsonMetadata) => {
    migrationsJsonMetadata.runningMigrations =
      migrationsJsonMetadata.runningMigrations?.filter((n) => n !== name);
    if (migrationsJsonMetadata.runningMigrations?.length === 0) {
      delete migrationsJsonMetadata.runningMigrations;
    }
    return migrationsJsonMetadata;
  };
}
