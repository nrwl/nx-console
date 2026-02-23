import { gt, gte, NxVersion } from '@nx-console/nx-version';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { getNxVersion } from '@nx-console/vscode-nx-workspace';
import { logAndShowError } from '@nx-console/vscode-output-channels';
import { CliTask } from '@nx-console/vscode-tasks/src/lib/cli-task';
import {
  getPackageInfo,
  PackageInformationResponse,
} from '@nx-console/vscode-utils';
import { join } from 'path';
import { major, rcompare } from 'semver';
import { QuickPickItem, tasks, window } from 'vscode';
import { viewPackageJsonDiff } from '../git-extension/view-diff';
import { importMigrateUIApi } from './utils';
import { existsSync, writeFileSync } from 'fs';
import { getTelemetry } from '@nx-console/vscode-telemetry';

export async function startMigration(custom = false) {
  getTelemetry().logUsage('migrate.start');
  const nxVersion = await getNxVersion();

  let pkgInfo: PackageInformationResponse;
  try {
    pkgInfo = await getPackageInfo('nx');
  } catch (e) {
    logAndShowError(
      'Failed to retrieve version information from npm',
      `Error while retrieving Nx version information from npm: \n ${e}`,
    );
    return;
  }

  let flags = [];
  let versionToMigrateTo: string | undefined;
  if (custom) {
    versionToMigrateTo = await promptForVersion(nxVersion, pkgInfo);
    if (!versionToMigrateTo) {
      return;
    }
    const continueMigration = await checkAndConfirmMultipleMajors(
      nxVersion,
      versionToMigrateTo,
      pkgInfo,
    );
    if (!continueMigration) {
      return;
    }
    const flagsObject = await promptForCustomFlags();
    if (!flagsObject) {
      return;
    }
    flags = Object.entries(flagsObject).map(
      ([key, value]) => `--${key}=${value}`,
    );
  } else {
    versionToMigrateTo = getDefaultMigrateVersion(nxVersion, pkgInfo);
  }

  if (!versionToMigrateTo) {
    return;
  }

  const workspacePath = getNxWorkspacePath();

  const command = `nx migrate ${versionToMigrateTo}`;

  const task = await CliTask.create({
    command: 'migrate',
    positional: versionToMigrateTo,
    flags,
  });
  await tasks.executeTask(task);

  let success = false;
  await new Promise((resolve) => {
    tasks.onDidEndTaskProcess((taskEndEvent) => {
      if (taskEndEvent.execution.task.name === command) {
        if (taskEndEvent.exitCode === 0) {
          success = true;
        }
        resolve(true);
      }
    });
  });

  if (!success) {
    window.showErrorMessage(
      'Migration failed, see integrated terminal for more details.',
    );
    return;
  }

  const migrationJsonPath = join(workspacePath, 'migrations.json');
  if (!existsSync(migrationJsonPath)) {
    writeFileSync(
      migrationJsonPath,
      JSON.stringify({ migrations: [] }, null, 2),
    );
  }

  const migrateUiApi = await importMigrateUIApi(workspacePath);
  migrateUiApi.recordInitialMigrationMetadata(
    workspacePath,
    versionToMigrateTo,
  );

  viewPackageJsonDiff();
}

// if latest is 20.x, do the following
// current: 20.x -> latest
// current: 19.x -> latest
// current: 18.x -> 19
// current: 17.x -> 18
function getDefaultMigrateVersion(
  nxVersion: NxVersion,
  pkgInfo: PackageInformationResponse,
): string {
  const currentMajor = nxVersion.major;
  const latestMajor = major(pkgInfo['dist-tags']?.['latest']).toString();

  if (!latestMajor) {
    return 'latest';
  }

  if (
    currentMajor === parseInt(latestMajor) ||
    currentMajor === parseInt(latestMajor) - 1
  ) {
    return 'latest';
  }

  return (currentMajor + 1).toString();
}

async function promptForVersion(
  nxVersion: NxVersion,
  pkgInfo: PackageInformationResponse,
) {
  const quickpickOptions: QuickPickItem[] = [];

  if (pkgInfo['dist-tags']?.['latest'] !== nxVersion.full) {
    quickpickOptions.push({ label: 'latest' });
  }

  quickpickOptions.push({ label: 'next' });

  const possibleVersions = Object.entries(pkgInfo.versions)
    .filter(
      ([versionNum, versionInfo]) =>
        !versionInfo.deprecated &&
        gt(versionNum, nxVersion) &&
        !versionNum.startsWith('9999') &&
        !versionNum.startsWith('0.0.0-pr') &&
        !versionNum.includes('canary') &&
        !versionNum.includes('beta') &&
        !versionNum.includes('rc'),
    )
    .sort(([a], [b]) => rcompare(a, b));

  const existingMajorOptions = new Set<string>();

  possibleVersions.forEach(([versionNum]) => {
    const versionMajor = major(versionNum).toString();
    if (existingMajorOptions.has(versionMajor)) {
      return;
    }
    existingMajorOptions.add(versionMajor);
    quickpickOptions.push({ label: versionNum });
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

async function checkAndConfirmMultipleMajors(
  nxVersion: NxVersion,
  versionToMigrateTo: string,
  pkgInfo: PackageInformationResponse,
): Promise<boolean> {
  try {
    if (pkgInfo['dist-tags'] && pkgInfo['dist-tags'][versionToMigrateTo]) {
      versionToMigrateTo = pkgInfo['dist-tags'][versionToMigrateTo];
    }
    const targetMajor = major(versionToMigrateTo);
    const currentMajor = major(nxVersion.full);

    if (!targetMajor || !currentMajor) {
      return true;
    }

    if (targetMajor > currentMajor + 1) {
      return await window
        .showQuickPick([{ label: 'Yes' }, { label: 'No' }], {
          title: `Version ${versionToMigrateTo} is more than one major version ahead of the ${nxVersion.full}. This is not supported and may cause issues.`,
          placeHolder: `Do you want to continue?`,
        })
        .then((selection) => selection?.label === 'Yes');
    }
    return true;
  } catch (e) {
    return true;
  }
}

type MigrateFlagsToPrompt = {
  from?: string;
  to?: string;
  interactive?: boolean;
};

async function promptForCustomFlags(
  selectedOptions?: MigrateFlagsToPrompt,
): Promise<MigrateFlagsToPrompt | undefined> {
  if (!selectedOptions) {
    selectedOptions = {};
  }
  const quickPick = window.createQuickPick();
  quickPick.placeholder = 'Enter custom flags or start migration';

  quickPick.items = [
    {
      label: 'Start Migration',
    },
    {
      label: '--from',
      description: selectedOptions.from,
      detail:
        'Use the provided versions for packages instead of the ones installed in node_modules',
    },
    {
      label: '--to',
      description: selectedOptions.to,
      detail:
        'Use the provided versions for packages instead of the ones calculated by the migrator',
    },
    {
      label: '--interactive',
      description: selectedOptions.interactive ? 'true' : 'false',
      detail:
        'Enable prompts to confirm whether to collect optional package updates and migrations.',
    },
  ];
  quickPick.show();

  const selection = await new Promise<string>((resolve) => {
    quickPick.onDidAccept(() => {
      resolve(quickPick.selectedItems[0]?.label);
      quickPick.hide();
      quickPick.dispose();
    });
  });

  if (!selection) {
    return undefined;
  }

  if (selection === 'Start Migration') {
    return selectedOptions;
  }

  if (selection === '--from') {
    const from = await window.showInputBox({
      prompt: 'Enter the version to migrate from',
      value: selectedOptions.from,
    });
    return await promptForCustomFlags({ ...selectedOptions, from });
  } else if (selection === '--to') {
    const to = await window.showInputBox({
      prompt: 'Enter the version to migrate to',
      value: selectedOptions.to,
    });
    return await promptForCustomFlags({ ...selectedOptions, to });
  } else if (selection === '--interactive') {
    const interactive = await window.showQuickPick(
      [{ label: 'true' }, { label: 'false' }],
      {
        placeHolder:
          'Enable prompts to confirm whether to collect optional package updates and migrations.',
      },
    );
    return await promptForCustomFlags({
      ...selectedOptions,
      interactive: Boolean(interactive),
    });
  }
}
