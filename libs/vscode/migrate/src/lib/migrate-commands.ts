import {
  commands,
  ExtensionContext,
  extensions,
  ProgressLocation,
  QuickPickItem,
  QuickPickItemKind,
  ShellExecution,
  Task,
  tasks,
  TaskScope,
  window,
} from 'vscode';
import { MigrateWebview } from './migrate-webview';
import { getNxVersion } from '@nx-console/vscode-nx-workspace';
import {
  getPackageInfo,
  PackageInformationResponse,
} from '@nx-console/vscode-utils';
import {
  getOutputChannel,
  logAndShowError,
} from '@nx-console/vscode-output-channels';
import { gte, NxVersion } from '@nx-console/nx-version';
import { rcompare } from 'semver';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { execSync } from 'child_process';
import { getPackageManagerCommand } from '@nx-console/shared-utils';
import { MigrationsJsonEntry } from 'nx/src/config/misc-interfaces';
import { tmpdir } from 'os';
import { findNxPackagePath, importNxPackagePath } from '@nx-console/shared-npm';
import { CliTaskProvider } from '@nx-console/vscode-tasks';
import { CliTask } from '@nx-console/vscode-tasks/src/lib/cli-task';
import { GitExtension } from './git-extension/git';

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
    })
  );
}

export async function startMigration(custom = false) {
  const nxVersion = await getNxVersion();

  let pkgInfo: PackageInformationResponse;
  try {
    pkgInfo = await getPackageInfo('nx');
  } catch (e) {
    logAndShowError(
      'Failed to retrieve version information from npm',
      `Error while retrieving Nx version information from npm: \n ${e}`
    );
    return;
  }

  let versionToMigrateTo: string | undefined;
  if (custom) {
    versionToMigrateTo = await promptForVersion(nxVersion, pkgInfo);
  } else {
    versionToMigrateTo = getDefaultMigrateVersion(nxVersion, pkgInfo);
  }

  if (!versionToMigrateTo) {
    return;
  }

  const workspacePath = getNxWorkspacePath();
  const migrationsJsonPath = join(workspacePath, 'migrations.json');

  if (existsSync(migrationsJsonPath)) {
    rmSync(migrationsJsonPath);
  }

  const command = `nx migrate ${versionToMigrateTo}`;

  const task = await CliTask.create({
    command: 'migrate',
    positional: versionToMigrateTo,
    flags: [],
  });
  await tasks.executeTask(task);

  await new Promise((resolve) => {
    tasks.onDidEndTaskProcess((taskEndEvent) => {
      if (taskEndEvent.execution.task.name === command) {
        resolve(true);
      }
    });
  });

  const parsedMigrationsJson = JSON.parse(
    readFileSync(migrationsJsonPath, 'utf-8')
  );

  try {
    const gitRef = execSync('git rev-parse HEAD', {
      cwd: workspacePath,
      encoding: 'utf-8',
    }).trim();

    const gitSubject = execSync('git log -1 --pretty=%s', {
      cwd: workspacePath,
      encoding: 'utf-8',
    }).trim();

    parsedMigrationsJson['nx-console'] = {
      initialGitRef: {
        ref: gitRef,
        subject: gitSubject,
      },
    };
  } catch (e) {
    parsedMigrationsJson['nx-console'] = {};
  }

  writeFileSync(
    migrationsJsonPath,
    JSON.stringify(parsedMigrationsJson, null, 2)
  );
}

async function promptForVersion(
  nxVersion: NxVersion,
  pkgInfo: PackageInformationResponse
) {
  const quickpickOptions: QuickPickItem[] = [];

  quickpickOptions.push({ label: 'latest' });
  quickpickOptions.push({ label: 'next' });

  const possibleVersions = Object.entries(pkgInfo.versions)
    .filter(
      ([versionNum, versionInfo]) =>
        !versionInfo.deprecated &&
        gte(versionNum, nxVersion) &&
        !versionNum.startsWith('9999') &&
        !versionNum.startsWith('0.0.0-pr') &&
        !versionNum.includes('canary') &&
        !versionNum.includes('beta') &&
        !versionNum.includes('rc')
    )
    .sort(([a], [b]) => rcompare(a, b));

  possibleVersions.forEach(([versionNum]) => {
    const major = versionNum.split('.')[0];
    const existingOption = quickpickOptions.find(
      (opt) => opt.label === major || opt.label.startsWith(major + '.')
    );
    if (existingOption) {
      return;
    }
    if (major === nxVersion.major.toString()) {
      quickpickOptions.push({ label: versionNum });
    } else {
      quickpickOptions.push({ label: major[0] });
    }
  });

  const quickPick = window.createQuickPick();

  quickPick.items = [
    ...quickpickOptions,
    { label: '', description: 'Start typing to install a custom version' },
  ];

  quickPick.onDidChangeValue((value: string) => {
    quickPick.items = [
      ...quickpickOptions,
      {
        label: quickPick.value,
        description: value
          ? 'Install custom version'
          : 'Start typing to install a custom version',
      },
    ];
  });

  quickPick.placeholder = 'Select a version to migrate to';

  return await new Promise<string | undefined>((resolve) => {
    quickPick.show();
    quickPick.onDidAccept(() => {
      resolve(quickPick.selectedItems[0]?.label);
      quickPick.hide();
      quickPick.dispose();
    });
    quickPick.onDidHide(() => {
      resolve(undefined);
    });
  });
}

// if latest is 20.x, do the following
// current: 20.x -> latest
// current: 19.x -> latest
// current: 18.x -> 19
// current: 17.x -> 18
function getDefaultMigrateVersion(
  nxVersion: NxVersion,
  pkgInfo: PackageInformationResponse
): string {
  const currentMajor = nxVersion.major;
  const latestMajor = pkgInfo['dist-tags']?.['latest']?.split('.')?.[0];

  if (!latestMajor) {
    return 'latest';
  }

  if (
    currentMajor === parseInt(latestMajor) ||
    currentMajor === parseInt(latestMajor) - 1
  ) {
    return 'latest';
  }

  return (currentMajor - 1).toString();
}

export async function runSingleMigration(migration: MigrationsJsonEntry) {
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
          `${pm.exec} nx migrate --runMigrations=${relativePath}`,
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
