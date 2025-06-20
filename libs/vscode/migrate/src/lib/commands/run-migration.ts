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
      const migrateUiApi = await importMigrateUIApi(workspacePath);
      await migrateUiApi.runSingleMigration(
        workspacePath,
        migration,
        configuration,
      );

      // Refresh after migration completes and writes to migrations.json
      commands.executeCommand('nxMigrate.refreshWebview');
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
