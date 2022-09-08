import {
  detectPackageManager,
  getPackageManagerCommand,
  PackageManager,
} from '@nrwl/devkit';
import { getGenerators } from '@nx-console/collections';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { getGeneratorOptions, selectFlags } from '@nx-console/vscode/tasks';
import { getTelemetry } from '@nx-console/vscode/utils';
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
      vscodeAddDependencyCommand
    )
  );
}

let workspace: string;
let pkgManager: PackageManager;

async function vscodeAddDependencyCommand() {
  workspace = WorkspaceConfigurationStore.instance.get('nxWorkspacePath', '');
  pkgManager = detectPackageManager(workspace);

  const dep = await promptForDependencyName();

  if (dep) {
    getTelemetry().featureUsed('add-dependency');
    addDependency(dep);
    const disposable = tasks.onDidEndTask(() => {
      executeInitGenerator(dep);
      disposable.dispose();
    }, undefined);
  }
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

function addDependency(dependency: string) {
  const command = `${getPackageManagerCommand(pkgManager).add} ${dependency}`;
  const task = new Task(
    {
      type: 'nx',
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
    { includeHidden: true }
  );

  const initGeneratorName = `${dependency}:init`;
  const initGenerator = generators.find((c) => c.name === initGeneratorName);

  if (initGenerator?.data?.collection) {
    const workspaceType = WorkspaceConfigurationStore.instance.get(
      'workspaceType',
      'nx'
    );
    const opts = await getGeneratorOptions(
      workspace,
      initGenerator.data?.collection,
      initGenerator.name,
      initGenerator.path,
      workspaceType
    );
    let selectedFlags;
    if (opts.length) {
      selectedFlags = await selectFlags(
        initGenerator.name,
        opts,
        workspaceType
      );
    }
    const command = `${
      getPackageManagerCommand(pkgManager).exec
    } nx g ${initGeneratorName} ${selectedFlags?.reduce(
      (acc, curr) => `${acc} ${curr}`,
      ''
    )} --interactive=false`;
    const task = new Task(
      { type: 'nx' },
      TaskScope.Workspace,
      command,
      pkgManager,
      new ShellExecution(command)
    );
    tasks.executeTask(task);
  }
}

function getDependencySuggestions(): Promise<
  {
    name: string;
    description: string;
    url: string;
  }[]
> {
  const headers = { 'Accept-Encoding': 'gzip, deflate' };
  return xhr({
    url: 'https://raw.githubusercontent.com/nrwl/nx/master/community/approved-plugins.json',
    followRedirects: 5,
    headers,
  }).then(
    (response) => {
      return JSON.parse(response.responseText);
    },
    (error: XHRResponse) => {
      return Promise.reject(error.responseText);
    }
  );
}
