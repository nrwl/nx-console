import { gte, NxVersion } from '@nx-console/nx-version';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { getNxVersion } from '@nx-console/vscode-nx-workspace';
import { logAndShowError } from '@nx-console/vscode-output-channels';
import { CliTask } from '@nx-console/vscode-tasks/src/lib/cli-task';
import {
  PackageInformationResponse,
  getPackageInfo,
} from '@nx-console/vscode-utils';
import { execSync } from 'child_process';
import { existsSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { rcompare } from 'semver';
import { QuickPickItem, tasks, window } from 'vscode';

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

  let flags = [];
  let versionToMigrateTo: string | undefined;
  if (custom) {
    versionToMigrateTo = await promptForVersion(nxVersion, pkgInfo);
    if (!versionToMigrateTo) {
      return;
    }
    const flagsObject = await promptForCustomFlags();
    if (!flagsObject) {
      return;
    }
    flags = Object.entries(flagsObject).map(
      ([key, value]) => `--${key}=${value}`
    );
  } else {
    versionToMigrateTo = getDefaultMigrateVersion(nxVersion, pkgInfo);
  }

  if (!versionToMigrateTo) {
    return;
  }

  const workspacePath = getNxWorkspacePath();
  const migrationsJsonPath = join(workspacePath, 'migrations.json');

  const command = `nx migrate ${versionToMigrateTo}`;

  const task = await CliTask.create({
    command: 'migrate',
    positional: versionToMigrateTo,
    flags,
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

type MigrateFlagsToPrompt = {
  from?: string;
  to?: string;
  interactive?: boolean;
};

async function promptForCustomFlags(
  selectedOptions?: MigrateFlagsToPrompt
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
      }
    );
    return await promptForCustomFlags({
      ...selectedOptions,
      interactive: Boolean(interactive),
    });
  }
}
