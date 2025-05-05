import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { logAndShowError } from '@nx-console/vscode-output-channels';
import { execSync } from 'child_process';
import {
  commands,
  ExtensionContext,
  extensions,
  ProgressLocation,
  window,
  workspace,
} from 'vscode';
import { startMigration } from './start-migration';
import {
  importMigrateUIApi,
  modifyMigrationsJsonMetadata,
  readMigrationsJsonMetadata,
} from './utils';
import { GitExtension } from '../git-extension/git';
import { viewPackageJsonDiff } from '../git-extension/view-diff';
import { MigrateWebview } from '../migrate-webview';
import type { MigrationDetailsWithId } from 'nx/src/config/misc-interfaces';
import { join } from 'path';
import { existsSync } from 'fs';
import { getPackageManagerCommand } from '@nx-console/shared-npm';

export function registerCommands(
  context: ExtensionContext,
  migrateWebview: MigrateWebview,
) {
  context.subscriptions.push(
    commands.registerCommand('nxMigrate.open', () => {
      migrateWebview.openMigrateUi();
    }),
    commands.registerCommand('nxMigrate.close', () => {
      migrateWebview.closeMigrateUi();
    }),
    commands.registerCommand('nxMigrate.startMigration', async () => {
      await startMigration();
    }),
    commands.registerCommand('nxMigrate.viewDiff', async () => {
      await viewPackageJsonDiff();
    }),
  );
}

export async function skipMigration(migration: MigrationDetailsWithId) {
  const workspacePath = getNxWorkspacePath();
  const migrateUIApi = await importMigrateUIApi(workspacePath);
  migrateUIApi.modifyMigrationsJsonMetadata(
    workspacePath,
    migrateUIApi.addSkippedMigration(migration.id),
  );
}

export async function undoMigration(migration: MigrationDetailsWithId) {
  const workspacePath = getNxWorkspacePath();
  const migrateUIApi = await importMigrateUIApi(workspacePath);
  migrateUIApi.modifyMigrationsJsonMetadata(
    workspacePath,
    // TODO: Once Nx is updated with the `undoMigration` API we can remove the ts-ignore.
    // This is safe to call, since this code path only happens if the bundled or local version of Nx exposes the "Undo" button.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    migrateUIApi.undoMigration(workspacePath, migration.id),
  );
}

export async function confirmPackageChanges() {
  window.withProgress(
    {
      title: `Installing dependencies`,
      location: ProgressLocation.Notification,
      cancellable: false,
    },
    async () => {
      const nxWorkspacePath = getNxWorkspacePath();
      const pm = await getPackageManagerCommand(nxWorkspacePath);

      try {
        execSync(`${pm.install}`, {
          cwd: nxWorkspacePath,
        });

        modifyMigrationsJsonMetadata((migrationsJsonMetadata) => {
          migrationsJsonMetadata.confirmedPackageUpdates = true;
          return migrationsJsonMetadata;
        });

        await commands.executeCommand('git.refresh');

        const gitExtension =
          extensions.getExtension<GitExtension>('vscode.git').exports;
        const api = gitExtension.getAPI(1);

        const repository = api.repositories[0];

        const filesToAdd = repository.state.workingTreeChanges
          .map((change) => change.uri.fsPath)
          .filter((change) => {
            return (
              change.includes('package.json') ||
              change.includes('migrations.json') ||
              change.includes('package-lock.json') ||
              change.includes('yarn.lock') ||
              change.includes('pnpm-lock.yaml')
            );
          });

        await repository.add(filesToAdd);

        await repository.commit('chore: start nx migration', {
          noVerify: true,
        });

        commands.executeCommand('nxMigrate.open');
      } catch (e) {
        logAndShowError(
          'An error occurred while installing dependencies',
          `An error occurred while installing dependencies: \n ${e}`,
        );
      }
    },
  );
}

export async function cancelMigration() {
  const nxWorkspacePath = getNxWorkspacePath();
  const migrationsJsonMetadata = readMigrationsJsonMetadata();
  const data = migrationsJsonMetadata.initialGitRef;

  if (!data) {
    window.showErrorMessage(
      "Couldn't find previous git ref. Did you manually modify migrations.json?",
    );
    return;
  }

  window
    .showWarningMessage(
      `Are you sure you want to cancel the migration? This will reset your workspace to the commit "${
        data.subject
      }" (${data.ref.slice(0, 7)})`,
      {
        modal: true,
      },
      'Abort migration',
    )
    .then(async (result) => {
      if (result === 'Abort migration') {
        execSync(`git reset --hard ${data.ref}`, { cwd: nxWorkspacePath });
        execSync(`git clean -fd`, { cwd: nxWorkspacePath });
        const pm = await getPackageManagerCommand(nxWorkspacePath);
        commands.executeCommand('nxMigrate.close');
        window.withProgress(
          {
            location: ProgressLocation.Notification,
            title: 'Installing original dependencies',
          },
          async () => {
            execSync(`${pm.install}`, { cwd: nxWorkspacePath });
            commands.executeCommand('nxMigrate.refresh');
          },
        );
      }
    });
}

export async function viewImplementation(migration: MigrationDetailsWithId) {
  const nxWorkspacePath = getNxWorkspacePath();

  const migrateUIApi = await importMigrateUIApi(nxWorkspacePath);

  try {
    const fullPath = await migrateUIApi.getImplementationPath(
      nxWorkspacePath,
      migration,
    );

    if (!existsSync(fullPath)) {
      window.showErrorMessage(`Cannot find implementation file at ${fullPath}`);
      return;
    }
    workspace.openTextDocument(fullPath).then((doc) => {
      window.showTextDocument(doc);
    });
  } catch (e) {
    window.showErrorMessage(
      `Cannot find implementation file for ${migration.name}`,
    );
  }
}

export async function viewDocumentation(migration: MigrationDetailsWithId) {
  const migrationPackage = migration.package.startsWith('@nx')
    ? migration.package.replace('@nx/', '')
    : migration.package;
  const url = `https://nx.dev/nx-api/${migrationPackage}#${migration.name.replace(
    /[.-]/g,
    '',
  )}`;

  commands.executeCommand('vscode.open', url);
}
