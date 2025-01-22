import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { execSync } from 'child_process';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { window, commands } from 'vscode';
import { readMigrationsJsonMetadata } from './utils';

export async function finishMigration(squashCommits: boolean) {
  window
    .showWarningMessage(
      'Are you sure you want to finish the migration?',
      {
        modal: true,
        detail:
          'This will remove the migrations.json file and commit the changes.',
      },
      'Finish Migration'
    )
    .then(async (result) => {
      if (result === 'Finish Migration') {
        const workspacePath = getNxWorkspacePath();
        const migrationsJsonPath = join(workspacePath, 'migrations.json');

        const migrationsJsonMetadata = readMigrationsJsonMetadata();
        const initialGitRef = migrationsJsonMetadata.initialGitRef.ref;
        const targetVersion = migrationsJsonMetadata.targetVersion;

        const commitMessage = squashCommits
          ? await window.showInputBox({
              prompt: 'Enter a commit message',
              value: `chore: migrate nx to ${targetVersion}`,
            })
          : `chore: migrate nx to ${targetVersion}`;

        if (!commitMessage) {
          return;
        }

        if (existsSync(migrationsJsonPath)) {
          rmSync(migrationsJsonPath);
        }
        execSync('git add .', {
          cwd: workspacePath,
          encoding: 'utf-8',
        });

        execSync(`git commit -m "${commitMessage}" --no-verify`, {
          cwd: workspacePath,
          encoding: 'utf-8',
        });

        if (squashCommits && initialGitRef) {
          try {
            execSync(`git reset --soft ${initialGitRef}`, {
              cwd: workspacePath,
              encoding: 'utf-8',
            });

            execSync(`git commit -m "${commitMessage}" --no-verify`, {
              cwd: workspacePath,
              encoding: 'utf-8',
            });
          } catch (e) {
            window.showErrorMessage(`Failed to squash commits: ${e.message}`);
            return;
          }
        }

        commands.executeCommand('nxMigrate.close');
        commands.executeCommand('nxMigrate.refresh');
      }
    });
}
