import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { execSync } from 'child_process';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { window, commands } from 'vscode';
import { importMigrateUIApi, readMigrationsJsonMetadata } from './utils';
import { logAndShowError } from '@nx-console/vscode-output-channels';

export async function finishMigration(squashCommits: boolean) {
  window
    .showWarningMessage(
      'Are you sure you want to finish the migration?',
      {
        modal: true,
        detail:
          'This will remove the migrations.json file and commit the changes.',
      },
      'Finish Migration',
    )
    .then(async (result) => {
      if (result === 'Finish Migration') {
        const workspacePath = getNxWorkspacePath();
        const migrationsJsonMetadata = readMigrationsJsonMetadata();

        const commitMessage = squashCommits
          ? await window.showInputBox({
              prompt: 'Enter a commit message',
              value: `chore: migrate nx to ${migrationsJsonMetadata.targetVersion}`,
            })
          : `chore: migrate nx to ${migrationsJsonMetadata.targetVersion}`;

        if (!commitMessage) {
          return;
        }

        try {
          const migrateUiApi = await importMigrateUIApi(workspacePath);
          migrateUiApi.finishMigrationProcess(
            workspacePath,
            squashCommits,
            commitMessage,
          );
        } catch (e) {
          logAndShowError(
            'Failed to finish migration process',
            `Failed to finish migration process: ${e}`,
          );
        }

        commands.executeCommand('nxMigrate.close');
        commands.executeCommand('nxMigrate.refresh');
      }
    });
}
