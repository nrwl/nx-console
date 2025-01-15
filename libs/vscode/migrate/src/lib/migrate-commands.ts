import {
  commands,
  ExtensionContext,
  ProgressLocation,
  QuickPickItem,
  QuickPickItemKind,
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
import { gte } from '@nx-console/nx-version';
import { rcompare } from 'semver';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { execSync } from 'child_process';
import { getPackageManagerCommand } from '@nx-console/shared-utils';
import { MigrationsJsonEntry } from 'nx/src/config/misc-interfaces';
import { tmpdir } from 'os';
import { findNxPackagePath, importNxPackagePath } from '@nx-console/shared-npm';

export function registerCommands(
  context: ExtensionContext,
  migrateWebview: MigrateWebview
) {
  context.subscriptions.push(
    commands.registerCommand('nxMigrate.open', () => {
      migrateWebview.openMigrateUi();
    }),
    commands.registerCommand('nxMigrate.startMigration', async () => {
      await startMigration();
    })
  );
}

// select version to migrate to
// delete old migrations.json
// run nx migrate
// add nx-console section to migrations.json
async function startMigration() {
  const versionToMigrateTo = await promptForVersion();
  if (!versionToMigrateTo) {
    return;
  }

  const workspacePath = getNxWorkspacePath();
  const migrationsJsonPath = join(workspacePath, 'migrations.json');

  if (existsSync(migrationsJsonPath)) {
    rmSync(migrationsJsonPath);
  }

  const pm = await getPackageManagerCommand(workspacePath);

  window.withProgress(
    {
      title: `Migrating to ${versionToMigrateTo}`,
      location: ProgressLocation.Notification,
      cancellable: false,
    },
    async (progress) => {
      try {
        progress.report({
          message: 'Running nx migrate',
        });
        execSync(`${pm.exec} nx migrate ${versionToMigrateTo}`, {
          cwd: workspacePath,
        });
        progress.report({
          increment: 70,
          message: 'Installing dependencies',
        });
        execSync(`${pm.install}`, {
          cwd: workspacePath,
        });
        progress.report({
          increment: 25,
        });
        const parsedMigrationsJson = JSON.parse(
          readFileSync(migrationsJsonPath, 'utf-8')
        );
        parsedMigrationsJson['nx-console'] = {};
        writeFileSync(
          migrationsJsonPath,
          JSON.stringify(parsedMigrationsJson, null, 2)
        );
        commands.executeCommand('nxMigrate.open');
      } catch (e) {
        logAndShowError(
          'An error occurred while migrating',
          `An error occurred while migrating: \n ${e}`
        );
      }
    }
  );
}

async function promptForVersion() {
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
