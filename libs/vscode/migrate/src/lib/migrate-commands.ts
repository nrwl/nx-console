import { importNxPackagePath } from '@nx-console/shared-npm';
import { getPackageManagerCommand } from '@nx-console/shared-utils';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import {
  getOutputChannel,
  logAndShowError,
} from '@nx-console/vscode-output-channels';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { MigrationsJsonEntry } from 'nx/src/config/misc-interfaces';
import { join, relative } from 'path';
import {
  commands,
  ExtensionContext,
  extensions,
  ProgressLocation,
  TextDocumentShowOptions,
  Uri,
  window,
} from 'vscode';
import { startMigration } from './commands/start-migration';
import { GitExtension } from './git-extension/git';
import { MigrateWebview } from './migrate-webview';

export function registerCommands(
  context: ExtensionContext,
  migrateWebview: MigrateWebview
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
      await viewDiff();
    })
  );
}

export async function runSingleMigration(
  migration: MigrationsJsonEntry,
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

export async function finishMigration() {
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

        repository.add(filesToAdd);

        repository.commit('chore: start nx migration', {
          signCommit: true,
          noVerify: true,
        });

        commands.executeCommand('nxMigrate.open');
      } catch (e) {
        logAndShowError(
          'An error occurred while installing dependencies',
          `An error occurred while installing dependencies: \n ${e}`
        );
      }
    }
  );
}

export async function cancelMigration() {
  const nxWorkspacePath = getNxWorkspacePath();
  const migrationsJsonPath = join(nxWorkspacePath, 'migrations.json');
  const migrationsJson = JSON.parse(readFileSync(migrationsJsonPath, 'utf-8'));

  const data = migrationsJson['nx-console']?.initialGitRef;

  if (!data) {
    window.showErrorMessage(
      "Couldn't find previous git ref. Did you manually modify migrations.json?"
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
      'Abort migration'
    )
    .then(async (result) => {
      if (result === 'Abort migration') {
        execSync(`git reset --hard ${data.ref}`, { cwd: nxWorkspacePath });
        const pm = await getPackageManagerCommand(nxWorkspacePath);
        commands.executeCommand('nxMigrate.close');
        window.withProgress(
          {
            location: ProgressLocation.Notification,
            title: 'Installing original dependencies',
          },
          async () => {
            execSync(`${pm.exec} install`, { cwd: nxWorkspacePath });
            commands.executeCommand('nxMigrate.refresh');
          }
        );
      }
    });
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

function modifyMigrationsJsonMetadata(
  modify: (migrationsJsonMetadata: any) => any
) {
  const nxWorkspacePath = getNxWorkspacePath();
  const migrationsJsonPath = join(nxWorkspacePath, 'migrations.json');
  const migrationsJson = JSON.parse(readFileSync(migrationsJsonPath, 'utf-8'));
  migrationsJson['nx-console'] = modify(migrationsJson['nx-console']);
  writeFileSync(migrationsJsonPath, JSON.stringify(migrationsJson, null, 2));
}

export async function viewDiff() {
  const gitExtension =
    extensions.getExtension<GitExtension>('vscode.git').exports;
  const api = gitExtension.getAPI(1);

  const packageJsonPath = join(getNxWorkspacePath(), 'package.json');
  const packageJsonUri = Uri.file(packageJsonPath);

  const gitUri = api.toGitUri(packageJsonUri, 'HEAD');
  commands.executeCommand('vscode.diff', gitUri, packageJsonUri, null, {
    preview: true,
    preserveFocus: true,
  } as TextDocumentShowOptions);

  commands.executeCommand('nxMigrate.focus');
}
