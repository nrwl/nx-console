import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import type { MigrationDetailsWithId } from 'nx/src/config/misc-interfaces';
import { commands, ProgressLocation, window } from 'vscode';
import { importMigrateUIApi } from './utils';

export async function runSingleMigration(
  migration: MigrationDetailsWithId,
  configuration: { createCommits: boolean },
) {
  const workspacePath = getNxWorkspacePath();

  await window.withProgress(
    {
      location: ProgressLocation.Notification,
      title: `Running ${migration.name}`,
    },
    async () => {
      // TODO: remove this once actual version is released
      //       the nx implementation ignores custom registries here
      process.env['NX_MIGRATE_CLI_VERSION'] = '0.0.0-pr-29720-ae0a5be';
      commands.executeCommand('nxMigrate.refreshWebview');

      const migrateUiApi = await importMigrateUIApi(workspacePath);
      migrateUiApi.runSingleMigration(workspacePath, migration, configuration);
    },
  );
}

export async function runManyMigrations(
  migrations: MigrationDetailsWithId[],
  configuration: { createCommits: boolean },
) {
  for (const migration of migrations) {
    await runSingleMigration(migration, configuration);
  }
}
