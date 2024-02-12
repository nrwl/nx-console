import {
  readJsonFile,
  detectPackageManager,
  getPackageManagerCommand,
  PackageManager,
} from 'nx/src/devkit-exports';
import {
  getGeneratorOptions,
  getGenerators,
  getNxVersion,
} from '@nx-console/vscode/nx-workspace';
import { getNxWorkspace } from '@nx-console/vscode/nx-workspace';
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
    const { workspacePath } = await getNxWorkspace();
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
      addDependency(dep, version, installAsDevDependency, workspacePath);
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

function addDependency(
  dependency: string,
  version: string,
  installAsDevDependency: boolean,
  workspacePath: string
) {
  const pkgManagerCommands = getPackageManagerCommand(pkgManager);
  const pkgManagerWorkspaceFlag = getWorkspaceAddFlag(
    pkgManager,
    workspacePath
  );
  const command = `${
    installAsDevDependency ? pkgManagerCommands.addDev : pkgManagerCommands.add
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
}

async function executeInitGenerator(dependency: string, workspacePath: string) {
  const generators = await getGenerators({
    includeHidden: true,
    includeNgAdd: true,
  });

  let initGeneratorName = `${dependency}:init`;
  let initGenerator = generators.find((g) => g.name === initGeneratorName);
  if (!initGenerator) {
    initGeneratorName = `${dependency}:ng-add`;
    initGenerator = generators.find((g) => g.name === initGeneratorName);
  }

  if (!initGenerator?.data) {
    return;
  }

  const opts = await getGeneratorOptions({
    collection: initGenerator.data.collection,
    name: initGenerator.name,
    path: initGenerator.schemaPath,
  });
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
    getShellExecutionForConfig({
      cwd: workspacePath,
      displayCommand: command,
      encapsulatedNx: false,
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
          name: `@${version.major <= 15 ? 'nrwl' : 'nx'}/${pkg.name}`,
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

function getWorkspaceAddFlag(
  pkgManager: string,
  workspacePath: string
): string {
  const pkgJson = readJsonFile<{
    workspaces?: string[];
    private?: boolean;
  }>(join(workspacePath, 'package.json'));
  if (pkgManager === 'yarn') {
    const isWorkspace =
      !!pkgJson.private &&
      !!pkgJson.workspaces &&
      pkgJson.workspaces?.length > 0;
    return isWorkspace ? '-W' : '';
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
