import {
  detectPackageManager,
  getPackageManagerCommand,
  PackageManager,
} from '@nrwl/devkit';
import { getGenerators } from '@nx-console/shared/collections';
import { getNxWorkspace } from '@nx-console/vscode/nx-workspace';
import { getGeneratorOptions, selectFlags } from '@nx-console/vscode/tasks';
import {
  getShellExecutionForConfig,
  getTelemetry,
  getWorkspacePath,
} from '@nx-console/vscode/utils';
import { xhr, XHRResponse } from 'request-light';
import { gte, major, rcompare } from 'semver';
import {
  commands,
  ExtensionContext,
  QuickInput,
  QuickPickItem,
  QuickPickItemKind,
  ShellExecution,
  Task,
  tasks,
  TaskScope,
  window,
} from 'vscode';

import { resolveDependencyVersioning } from './dependency-versioning';

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
    const { workspacePath, workspaceType } = await getNxWorkspace();
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
      addDependency(dep, version, installAsDevDependency);
      const disposable = tasks.onDidEndTaskProcess((taskEndEvent) => {
        if (
          taskEndEvent.execution.task.definition.type === 'nxconsole-add-dep'
        ) {
          quickInput.hide();
          executeInitGenerator(dep, workspacePath, workspaceType);
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
  installAsDevDependency: boolean
) {
  const pkgManagerCommands = getPackageManagerCommand(pkgManager);
  const command = `${
    installAsDevDependency ? pkgManagerCommands.addDev : pkgManagerCommands.add
  } ${dependency}@${version}`;
  const task = new Task(
    {
      type: 'nxconsole-add-dep',
    },
    TaskScope.Workspace,
    command,
    pkgManager,
    new ShellExecution(command)
  );
  tasks.executeTask(task);
}
async function executeInitGenerator(
  dependency: string,
  workspacePath: string,
  workspaceType: 'ng' | 'nx'
) {
  const generators = await getGenerators(workspacePath, undefined, {
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

  const opts = await getGeneratorOptions(
    workspacePath,
    initGenerator.data.collection,
    initGenerator.name,
    initGenerator.path,
    workspaceType
  );
  let selectedFlags;
  if (opts.length) {
    selectedFlags = await selectFlags(initGenerator.name, opts, workspaceType);
  }
  const command = `${workspaceType} g ${initGeneratorName} ${
    selectedFlags?.join(' ') ?? ''
  } --interactive=false`;
  const task = new Task(
    { type: workspaceType },
    TaskScope.Workspace,
    command,
    pkgManager,
    getShellExecutionForConfig({
      cwd: workspacePath,
      displayCommand: command,
    })
  );
  tasks.executeTask(task);
}

function getDependencySuggestions(): Promise<
  {
    name: string;
    description: string;
  }[]
> {
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
          name: `@nrwl/${pkg.name}`,
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
