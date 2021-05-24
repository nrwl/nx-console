import { commands, ExtensionContext, window, Uri } from 'vscode';

import { selectSchematic } from '@nx-console/server';
import { verifyWorkspace } from '@nx-console/vscode/nx-workspace';
import { verifyBuilderDefinition } from '@nx-console/vscode/verify';
import {
  WorkspaceRouteTitle,
  RunTargetTreeItem,
} from '@nx-console/vscode/nx-run-target-view';
import { CliTaskProvider } from './cli-task-provider';
import { CliTaskQuickPickItem } from './cli-task-quick-pick-item';
import { selectFlags } from './select-flags';
import { Option } from '@nx-console/schema';
import { OptionType } from '@angular/cli/models/interface';
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

  commands.registerCommand(
    'nx.run',
    (project?: string, target?: string, configuration?: string) => {
      let flags;
      if (configuration) {
        flags = [`-c ${configuration}`];
      } else if (project && target) {
        // don't prompt for flags when project and target are already specified
        flags = [];
      }
      selectCliCommandAndPromptForFlags('run', project, target, flags)
    }
  );
  commands.registerCommand(`nx.run.fileexplorer`, (uri: Uri) =>
    selectCliCommandAndPromptForFlags('run', getCliProjectFromUri(uri))
  );

  commands.registerCommand(`ng.generate`, () =>
    selectSchematicAndPromptForFlags()
  );

  commands.registerCommand(`ng.generate.ui`, () =>
    selectCliCommandAndShowUi('generate', context.extensionPath)
  );
  commands.registerCommand(`nx.generate`, () =>
    selectSchematicAndPromptForFlags()
  );

  commands.registerCommand(`nx.generate.ui`, () =>
    selectCliCommandAndShowUi('generate', context.extensionPath)
  );
  commands.registerCommand(`nx.generate.ui.fileexplorer`, (uri: Uri) =>
    selectCliCommandAndShowUi('generate', context.extensionPath, uri)
  );
}

function selectCliCommandAndShowUi(
  command: string,
  extensionPath: string,
  uri?: Uri
) {
  const workspacePath = cliTaskProvider.getWorkspacePath();
  if (!workspacePath) {
    window.showErrorMessage(
      'Nx Console requires a workspace be set to perform this action'
    );
    return;
  }
  const { validWorkspaceJson, configurationFilePath } = verifyWorkspace();
  if (!validWorkspaceJson) {
    window.showErrorMessage('Invalid configuration file');
    return;
  }
  const workspaceTreeItem = new RunTargetTreeItem(
    configurationFilePath,
    `${command[0].toUpperCase()}${command.slice(1)}` as WorkspaceRouteTitle,
    extensionPath
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
  flags?: string[]
) {
  const { validWorkspaceJson, json, workspaceType } = verifyWorkspace();

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
        Object.keys(json.projects[projectName].architect || {})
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

    flags = await selectFlags(isRunCommand
        ? `${command} ${projectName}:${target}`
        : `${command} ${projectName}`, options, workspaceType);
  }

  if (flags !== undefined) {
    cliTaskProvider.executeTask({
      positional: isRunCommand ? `${projectName}:${target}` : projectName,
      command,
      flags,
    });
  }
}

async function selectSchematicAndPromptForFlags() {
  const {
    validWorkspaceJson,
    workspaceType,
    configurationFilePath,
  } = verifyWorkspace();

  if (!validWorkspaceJson) {
    return;
  }

  const selection = await selectSchematic(configurationFilePath);
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

export function getCliProjectFromUri(uri: Uri): string | undefined {
  const project = cliTaskProvider.projectForPath(uri.fsPath);
  return project?.name;
}

export function selectCliProject(command: string, json: any) {
  const items = cliTaskProvider
    .getProjectEntries(json)
    .filter(([_, { architect }]) => Boolean(architect))
    .flatMap(([project, { architect }]) => ({ project, architect }))
    .filter(
      ({ architect }) =>
        Boolean(architect && architect[command]) || command === 'run'
    )
    .map(
      ({ project, architect }) =>
        new CliTaskQuickPickItem(
          project,
          architect![command]!,
          command,
          project
        )
    );

  if (!items.length) {
    window.showInformationMessage(
      `No projects have an architect command for ${command}`
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
