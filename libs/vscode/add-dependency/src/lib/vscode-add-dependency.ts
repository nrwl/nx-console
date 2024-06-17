import type { PackageManager } from 'nx/src/devkit-exports';
import {
  getGeneratorOptions,
  getGenerators,
  getNxVersion,
} from '@nx-console/vscode/nx-workspace';
import {
  getShellExecutionForConfig,
  getTelemetry,
  resolveDependencyVersioning,
} from '@nx-console/vscode/utils';
import { existsSync } from 'fs';
import { join } from 'path';
import { xhr, XHRResponse } from 'request-light';
import {
  commands,
  ExtensionContext,
  QuickInput,
  ShellExecution,
  Task,
  tasks,
  TaskScope,
  window,
} from 'vscode';
import { selectFlags } from '@nx-console/vscode/nx-cli-quickpicks';
import { execSync } from 'child_process';
import { major } from 'semver';
import { getNxWorkspacePath } from '@nx-console/vscode/configuration';
import { importNxPackagePath } from '@nx-console/shared/npm';
import { logAndShowTaskCreationError } from '@nx-console/vscode/output-channels';

export const ADD_DEPENDENCY_COMMAND = 'nxConsole.addDependency';
export const ADD_DEV_DEPENDENCY_COMMAND = 'nxConsole.addDevDependency';

export function registerVscodeAddDependency(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(
      ADD_DEPENDENCY_COMMAND,
      vscodeAddDependencyCommand(false)
    ),
    commands.registerCommand(
      ADD_DEV_DEPENDENCY_COMMAND,
      vscodeAddDependencyCommand(true)
    )
  );
}

let pkgManager: PackageManager;

function vscodeAddDependencyCommand(installAsDevDependency: boolean) {
  return async () => {
    const workspacePath = getNxWorkspacePath();
    const { detectPackageManager } = await importNxPackagePath<
      typeof import('nx/src/devkit-exports')
    >(workspacePath, 'src/devkit-exports');
    pkgManager = detectPackageManager(workspacePath);

    const depInput = await promptForDependencyInput();

    if (!depInput) {
      return;
    }
    const depVersioningInfo = await resolveDependencyVersioning(depInput);

    if (!depVersioningInfo?.version) {
      return;
    }

    const { dep, version } = depVersioningInfo;

    if (dep) {
      const quickInput = showLoadingQuickInput(dep);
      getTelemetry().featureUsed('add-dependency');
      await addDependency(dep, version, installAsDevDependency, workspacePath);
      const disposable = tasks.onDidEndTaskProcess((taskEndEvent) => {
        if (
          taskEndEvent.execution.task.definition.type === 'nxconsole-add-dep'
        ) {
          quickInput.hide();
          executeInitGenerator(dep, workspacePath);
          disposable.dispose();
        }
      }, undefined);
    }
  };
}

async function promptForDependencyInput(): Promise<string | undefined> {
  const packageSuggestions = (await getDependencySuggestions()).map((pkg) => ({
    label: pkg.name,
    description: pkg.description,
  }));
  const dep = await new Promise<string | undefined>((resolve) => {
    const quickPick = window.createQuickPick();
    quickPick.title = 'Select Dependency';
    quickPick.items = packageSuggestions;
    quickPick.placeholder =
      'The name of the dependency you want to add. Can be anything on the npm registry.';
    quickPick.canSelectMany = false;

    quickPick.onDidChangeValue(() => {
      quickPick.items = [
        ...packageSuggestions,
        {
          label: quickPick.value,
          description: `Look for package ${quickPick.value} on the registry.`,
        },
      ];
    });

    quickPick.onDidAccept(() => {
      resolve(quickPick.selectedItems[0]?.label);
      quickPick.hide();
    });

    quickPick.show();
  });

  return dep;
}

function showLoadingQuickInput(dependency: string): QuickInput {
  const quickInput = window.createQuickPick();
  quickInput.busy = true;
  quickInput.placeholder = `Please wait while ${dependency} is being installed. You might be prompted for init options.`;
  quickInput.enabled = false;

  quickInput.onDidChangeValue(() => (quickInput.value = ''));

  quickInput.show();
  return quickInput;
}

async function addDependency(
  dependency: string,
  version: string,
  installAsDevDependency: boolean,
  workspacePath: string
) {
  try {
    const { getPackageManagerCommand } = await importNxPackagePath<
      typeof import('nx/src/devkit-exports')
    >(workspacePath, 'src/devkit-exports');
    const pkgManagerCommands = getPackageManagerCommand(pkgManager);
    const pkgManagerWorkspaceFlag = await getWorkspaceAddFlag(
      pkgManager,
      workspacePath
    );
    const command = `${
      installAsDevDependency
        ? pkgManagerCommands.addDev
        : pkgManagerCommands.add
    } ${pkgManagerWorkspaceFlag} ${dependency}@${version}`;

    const task = new Task(
      {
        type: 'nxconsole-add-dep',
      },
      TaskScope.Workspace,
      command,
      pkgManager,
      new ShellExecution(command, { cwd: workspacePath })
    );
    tasks.executeTask(task);
  } catch (e) {
    logAndShowTaskCreationError(
      e,
      `An error occured while adding ${dependency}. Please see the logs for more information.`
    );
  }
}

async function executeInitGenerator(dependency: string, workspacePath: string) {
  const generators =
    (await getGenerators({
      includeHidden: true,
      includeNgAdd: true,
    })) ?? [];

  let initGeneratorName = `${dependency}:init`;
  let initGenerator = generators.find((g) => g.name === initGeneratorName);
  if (!initGenerator) {
    initGeneratorName = `${dependency}:ng-add`;
    initGenerator = generators.find((g) => g.name === initGeneratorName);
  }

  if (!initGenerator?.data) {
    return;
  }

  const opts =
    (await getGeneratorOptions({
      collection: initGenerator.data.collection,
      name: initGenerator.name,
      path: initGenerator.schemaPath,
    })) ?? [];
  let selectedFlags;
  if (opts.length) {
    selectedFlags = await selectFlags(initGenerator.name, opts);
  }
  const command = `nx g ${initGeneratorName} ${
    selectedFlags?.join(' ') ?? ''
  } --interactive=false`;
  const task = new Task(
    { type: 'nx' },
    TaskScope.Workspace,
    command,
    pkgManager,
    await getShellExecutionForConfig({
      cwd: workspacePath,
      displayCommand: command,
      encapsulatedNx: false,
      workspacePath,
    })
  );
  tasks.executeTask(task);
}

async function getDependencySuggestions(): Promise<
  {
    name: string;
    description: string;
  }[]
> {
  const version = await getNxVersion();
  const headers = { 'Accept-Encoding': 'gzip, deflate' };
  return Promise.all([
    xhr({
      url: 'https://raw.githubusercontent.com/nrwl/nx/master/docs/packages.json',
      followRedirects: 5,
      headers,
    }).then((response) => {
      return (
        JSON.parse(response.responseText) as {
          name: string;
          description: string;
        }[]
      )
        .filter(
          (pkg) =>
            pkg.name !== 'add-nx-to-monorepo' &&
            pkg.name !== 'cra-to-nx' &&
            pkg.name !== 'create-nx-plugin' &&
            pkg.name !== 'create-nx-workspace' &&
            pkg.name !== 'make-angular-cli-faster' &&
            pkg.name !== 'tao'
        )
        .map((pkg) => ({
          name: `@${(version?.major ?? 16) <= 15 ? 'nrwl' : 'nx'}/${pkg.name}`,
          description: pkg.description,
        }));
    }),
    xhr({
      url: 'https://raw.githubusercontent.com/nrwl/nx/master/community/approved-plugins.json',
      followRedirects: 5,
      headers,
    }).then((response) => {
      return JSON.parse(response.responseText);
    }),
  ]).then(
    (responses) => responses.flat(1),
    (error: XHRResponse) => {
      return Promise.reject(error.responseText);
    }
  );
}

async function getWorkspaceAddFlag(
  pkgManager: string,
  workspacePath: string
): Promise<string> {
  const { readJsonFile } = await importNxPackagePath<
    typeof import('nx/src/devkit-exports')
  >(workspacePath, 'src/devkit-exports');
  const pkgJson = readJsonFile<{
    workspaces?: string[];
    private?: boolean;
  }>(join(workspacePath, 'package.json'));
  if (pkgManager === 'yarn') {
    const isYarnV1 = major(execSync('yarn --version').toString().trim()) === 1;
    const isWorkspace =
      !!pkgJson.private &&
      !!pkgJson.workspaces &&
      pkgJson.workspaces?.length > 0;
    return isWorkspace && isYarnV1 ? '-W' : '';
  }
  if (pkgManager === 'npm') {
    const isWorkspace = !!pkgJson.workspaces && pkgJson.workspaces?.length > 0;
    return isWorkspace ? '--workspaces false' : '';
  }
  let pnpmYml = existsSync(join(workspacePath, 'pnpm-workspace.yaml'));
  if (!pnpmYml) {
    pnpmYml = existsSync(join(workspacePath, 'pnpm-workspace.yml'));
  }
  return pnpmYml ? '-w' : '';
}
