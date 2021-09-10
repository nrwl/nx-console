import { commands, ExtensionContext, window, Uri } from 'vscode';

import { selectGenerator } from '@nx-console/server';
import { verifyWorkspace } from '@nx-console/vscode/nx-workspace';
import { verifyBuilderDefinition } from '@nx-console/vscode/verify';
import {
  WorkspaceRouteTitle,
  RunTargetTreeItem,
} from '@nx-console/vscode/nx-run-target-view';
import { CliTaskProvider } from './cli-task-provider';
import { CliTaskQuickPickItem } from './cli-task-quick-pick-item';
import { selectFlags } from './select-flags';
import { GeneratorType, Option } from '@nx-console/schema';
import { OptionType } from '@angular/cli/models/interface';
import { WorkspaceJsonConfiguration } from '@nrwl/devkit';

const CLI_COMMAND_LIST = [
  'build',
  'deploy',
  'e2e',
  'lint',
  'serve',
  'test',
  'xi18n',
];

let cliTaskProvider: CliTaskProvider;

export function registerCliTaskCommands(
  context: ExtensionContext,
  n: CliTaskProvider
) {
  cliTaskProvider = n;

  CLI_COMMAND_LIST.forEach((command) => {
    context.subscriptions.push(
      commands.registerCommand(`ng.${command}`, () =>
        selectCliCommandAndPromptForFlags(command)
      ),
      commands.registerCommand(`ng.${command}.ui`, () =>
        selectCliCommandAndShowUi(command, context.extensionPath)
      ),
      commands.registerCommand(`nx.${command}`, () =>
        selectCliCommandAndPromptForFlags(command)
      ),
      commands.registerCommand(`nx.${command}.ui`, () =>
        selectCliCommandAndShowUi(command, context.extensionPath)
      )
    );
  });

  ['ng', 'nx'].forEach((cli) => {
    commands.registerCommand(
      `${cli}.run`,
      (project?: string, target?: string, configuration?: string) => {
        selectCliCommandAndPromptForFlags(
          'run',
          project,
          target,
          configuration
        );
      }
    );
    commands.registerCommand(`${cli}.run.fileexplorer`, async (uri: Uri) =>
      selectCliCommandAndPromptForFlags('run', await getCliProjectFromUri(uri))
    );

    commands.registerCommand(`${cli}.generate`, () =>
      selectGeneratorAndPromptForFlags()
    );

    commands.registerCommand(`${cli}.generate.ui`, () =>
      selectCliCommandAndShowUi('generate', context.extensionPath)
    );

    commands.registerCommand(`${cli}.generate.ui.fileexplorer`, (uri: Uri) =>
      selectCliCommandAndShowUi('generate', context.extensionPath, uri)
    );

    commands.registerCommand(`${cli}.generate.ui.app`, (uri: Uri) => {
      selectCliCommandAndShowUi(
        'generate',
        context.extensionPath,
        uri,
        GeneratorType.Application
      );
    });
    commands.registerCommand(`${cli}.generate.ui.lib`, (uri: Uri) => {
      selectCliCommandAndShowUi(
        'generate',
        context.extensionPath,
        uri,
        GeneratorType.Library
      );
    });
    commands.registerCommand(
      `${cli}.generate.ui.app.fileexplorer`,
      (uri: Uri) => {
        selectCliCommandAndShowUi(
          'generate',
          context.extensionPath,
          uri,
          GeneratorType.Application
        );
      }
    );
    commands.registerCommand(
      `${cli}.generate.ui.lib.fileexplorer`,
      (uri: Uri) => {
        selectCliCommandAndShowUi(
          'generate',
          context.extensionPath,
          uri,
          GeneratorType.Library
        );
      }
    );
  });
}

async function selectCliCommandAndShowUi(
  command: string,
  extensionPath: string,
  uri?: Uri,
  generatorType?: GeneratorType
) {
  const workspacePath = cliTaskProvider.getWorkspacePath();
  if (!workspacePath) {
    window.showErrorMessage(
      'Nx Console requires a workspace be set to perform this action'
    );
    return;
  }
  const { validWorkspaceJson, configurationFilePath } = await verifyWorkspace();
  if (!validWorkspaceJson) {
    window.showErrorMessage('Invalid configuration file');
    return;
  }
  const workspaceTreeItem = new RunTargetTreeItem(
    configurationFilePath,
    `${command[0].toUpperCase()}${command.slice(1)}` as WorkspaceRouteTitle,
    extensionPath,
    generatorType
  );

  commands.executeCommand(
    'nxConsole.revealWebViewPanel',
    workspaceTreeItem,
    uri
  );
}

async function selectCliCommandAndPromptForFlags(
  command: string,
  projectName?: string,
  target?: string,
  configuration?: string
) {
  let flags: string[] | undefined;
  if (configuration) {
    flags = [`--configuration=${configuration}`];
  } else if (projectName && target) {
    // don't prompt for flags when project and target are already specified
    flags = [];
  }
  const { validWorkspaceJson, json, workspaceType } = await verifyWorkspace();

  if (!projectName) {
    const selection = validWorkspaceJson
      ? await selectCliProject(command, json)
      : undefined;
    if (!selection) {
      return; // Do not execute a command if user clicks out of VSCode UI.
    }
    projectName = selection.projectName;
  }

  const isRunCommand = command === 'run';
  if (!target) {
    if (isRunCommand) {
      target = (await selectCliTarget(
        Object.keys(json.projects[projectName].targets || {})
      )) as string;
      if (!target) {
        return;
      }
    } else {
      target = command;
    }
  }

  const builderDefinition = await verifyBuilderDefinition(
    projectName,
    target,
    json
  );
  const {
    validBuilder,
    options: builderDefinitionOptions,
    configurations,
  } = builderDefinition;
  let options = [...builderDefinitionOptions];
  if (!validBuilder) {
    return;
  }

  if (!flags) {
    if (configurations.length) {
      const configurationsOption: Option = {
        name: 'configuration',
        description:
          'A named build target, as specified in the "configurations" section of angular.json.',
        type: OptionType.String,
        enum: configurations,
        aliases: [],
      };
      options = [configurationsOption, ...options];
    }

    flags = await selectFlags(
      isRunCommand
        ? `${command} ${projectName}:${target}`
        : `${command} ${projectName}`,
      options,
      workspaceType
    );
  }

  if (flags !== undefined) {
    cliTaskProvider.executeTask({
      positional: isRunCommand ? `${projectName}:${target}` : projectName,
      command,
      flags,
    });
  }
}

async function selectGeneratorAndPromptForFlags() {
  const { validWorkspaceJson, workspaceType, configurationFilePath } =
    await verifyWorkspace();

  if (!validWorkspaceJson) {
    return;
  }

  const selection = await selectGenerator(configurationFilePath);
  if (!selection) {
    return;
  }

  const flags = await selectFlags(
    `generate ${selection.positional}`,
    selection.options,
    workspaceType
  );

  if (flags !== undefined) {
    cliTaskProvider.executeTask({
      positional: selection.positional,
      command: 'generate',
      flags,
    });
  }
}

export async function getCliProjectFromUri(
  uri: Uri
): Promise<string | undefined> {
  const project = await cliTaskProvider.projectForPath(uri.fsPath);
  return project?.name;
}

export async function selectCliProject(
  command: string,
  json: WorkspaceJsonConfiguration
) {
  const items = (await cliTaskProvider.getProjectEntries(json))
    .filter(([, { targets }]) => Boolean(targets))
    .flatMap(([project, { targets }]) => ({ project, targets }))
    .filter(
      ({ targets }) => Boolean(targets && targets[command]) || command === 'run'
    )
    .map(
      ({ project, targets }) =>
        new CliTaskQuickPickItem(project, targets![command]!, command, project)
    );

  if (!items.length) {
    window.showInformationMessage(
      `No projects have an target command for ${command}`
    );

    return;
  }

  return window.showQuickPick(items, {
    placeHolder: `Project to ${command}`,
  });
}

async function selectCliTarget(targets: string[]): Promise<string | undefined> {
  return window.showQuickPick(targets, {
    placeHolder: 'Target to run',
  });
}
