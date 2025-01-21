import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { window, commands } from 'vscode';

export async function finishMigration(squashCommits: boolean) {
  window
    .showWarningMessage(
      'Are you sure you want to finish the migration?',
      {
        modal: true,
        detail: 'This will remove the migrations.json file',
      },
      'Finish Migration'
    )
    .then(async (result) => {
      if (result === 'Finish Migration') {
        const workspacePath = getNxWorkspacePath();
        const migrationsJsonPath = join(workspacePath, 'migrations.json');

        if (existsSync(migrationsJsonPath)) {
          rmSync(migrationsJsonPath);
        }
        commands.executeCommand('nxMigrate.close');
        commands.executeCommand('nxMigrate.refresh');
      }
    });
}
