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
      commands.executeCommand('nxMigrate.refreshWebview');

      // Make sure we are in the workspace so module resolution works correctly.
      // Angular 20 has a migration, for example, that won't work unless CWD is set to the workspace root.
      const originalCwd = process.cwd();
      process.chdir(workspacePath);

      try {
        const migrateUiApi = await importMigrateUIApi(workspacePath);
        await migrateUiApi.runSingleMigration(
          workspacePath,
          migration,
          configuration,
        );
      } finally {
        // Ensure we switch back since the extension host can be shared.
        process.chdir(originalCwd);
      }
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
