import {
  detectPackageManager,
  getPackageManagerCommand,
  PackageManager,
} from '@nrwl/devkit';
import { getGenerators } from '@nx-console/collections';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { getGeneratorOptions, selectFlags } from '@nx-console/vscode/tasks';
import {
  getShellExecutionForConfig,
  getTelemetry,
} from '@nx-console/vscode/utils';
import { xhr, XHRResponse } from 'request-light';
import {
  commands,
  ExtensionContext,
  ShellExecution,
  Task,
  tasks,
  TaskScope,
  window,
} from 'vscode';

export function registerVscodeAddDependency(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(
      'nxConsole.addDependency',
      vscodeAddDependencyCommand(false)
    ),
    commands.registerCommand(
      'nxConsole.addDevDependency',
      vscodeAddDependencyCommand(true)
    )
  );
}

let workspacePath: string;
let pkgManager: PackageManager;

function vscodeAddDependencyCommand(installAsDevDependency: boolean) {
  return async () => {
    workspacePath = WorkspaceConfigurationStore.instance.get(
      'nxWorkspacePath',
      ''
    );
    pkgManager = detectPackageManager(workspacePath);

    const dep = await promptForDependencyName();

    if (dep) {
      getTelemetry().featureUsed('add-dependency');
      addDependency(dep, installAsDevDependency);
      const disposable = tasks.onDidEndTaskProcess((taskEndEvent) => {
        if (
          taskEndEvent.execution.task.definition.type === 'nxconsole-add-dep'
        ) {
          executeInitGenerator(dep);
          disposable.dispose();
        }
      }, undefined);
    }
  };
}

async function promptForDependencyName(): Promise<string | undefined> {
  const packageSuggestions = (await getDependencySuggestions()).map((pkg) => ({
    label: pkg.name,
    description: pkg.description,
  }));
  const dep = await new Promise<string | undefined>((resolve) => {
    const quickPick = window.createQuickPick();
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

function addDependency(dependency: string, installAsDevDependency: boolean) {
  const pkgManagerCommands = getPackageManagerCommand(pkgManager);
  const command = `${
    installAsDevDependency ? pkgManagerCommands.addDev : pkgManagerCommands.add
  } ${dependency}`;
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
async function executeInitGenerator(dependency: string) {
  const generators = await getGenerators(
    WorkspaceConfigurationStore.instance.get('nxWorkspacePath', ''),
    undefined,
    { includeHidden: true, includeNgAdd: true }
  );

  let initGeneratorName = `${dependency}:init`;
  let initGenerator = generators.find((g) => g.name === initGeneratorName);
  if (!initGenerator) {
    initGeneratorName = `${dependency}:ng-add`;
    initGenerator = generators.find((g) => g.name === initGeneratorName);
  }

  if (!initGenerator?.data) {
    return;
  }

  const workspaceType = WorkspaceConfigurationStore.instance.get(
    'workspaceType',
    'nx'
  );
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
