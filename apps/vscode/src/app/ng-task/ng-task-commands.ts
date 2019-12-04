import { commands, ExtensionContext, window } from 'vscode';

import { selectSchematic } from '../select-schematic';
import { verifyBuilderDefinition } from '../verify-workspace/verify-builder-definition';
import {
  WorkspaceRouteTitle,
  WorkspaceTreeItem
} from '../workspace-tree/workspace-tree-item';
import { NgTaskProvider } from './ng-task-provider';
import { NgTaskQuickPickItem } from './ng-task-quick-pick-item';
import { selectFlags } from './select-flags';
import { verifyAngularJson } from '../verify-workspace/verify-angular-json';

const CLI_COMMAND_LIST = [
  'build',
  'deploy',
  'e2e',
  'lint',
  'serve',
  'test',
  'xi18n'
];

let ngTaskProvider: NgTaskProvider;

export function registerNgTaskCommands(
  context: ExtensionContext,
  n: NgTaskProvider
) {
  ngTaskProvider = n;

  CLI_COMMAND_LIST.forEach(command => {
    context.subscriptions.push(
      commands.registerCommand(`angularConsole.${command}`, () =>
        selectNgCliCommandAndPromptForFlags(command)
      ),
      commands.registerCommand(`angularConsole.${command}.ui`, () =>
        selectNgCliCommandAndShowUi(command, context.extensionPath)
      )
    );
  });

  commands.registerCommand(`angularConsole.generate`, () =>
    selectSchematicAndPromptForFlags(n.getWorkspacePath()!)
  );

  commands.registerCommand(`angularConsole.generate.ui`, () =>
    selectNgCliCommandAndShowUi('generate', context.extensionPath)
  );
}

function selectNgCliCommandAndShowUi(command: string, extensionPath: string) {
  const workspacePath = ngTaskProvider.getWorkspacePath();
  if (!workspacePath) {
    window.showErrorMessage(
      'Angular Console requires a workspace be set to perform this action'
    );
    return;
  }

  const workspaceTreeItem = new WorkspaceTreeItem(
    workspacePath,
    `${command[0].toUpperCase()}${command.slice(1)}` as WorkspaceRouteTitle,
    extensionPath
  );

  commands.executeCommand(
    'angularConsole.revealWebViewPanel',
    workspaceTreeItem
  );
}

async function selectNgCliCommandAndPromptForFlags(command: string) {
  const { validAngularJson, json } = verifyAngularJson(
    ngTaskProvider.getWorkspacePath()
  );

  const selection = validAngularJson
    ? await selectNgCliProject(command, json)
    : undefined;
  if (!selection) {
    return; // Do not execute a command if user clicks out of VSCode UI.
  }

  const { validBuilder, options } = await verifyBuilderDefinition(
    selection.projectName,
    command,
    json
  );
  if (!validBuilder) {
    return;
  }

  const flags = await selectFlags(command, selection.projectName, options);

  if (flags !== undefined) {
    ngTaskProvider.executeTask({
      positional: selection.projectName,
      command,
      flags
    });
  }
}

async function selectSchematicAndPromptForFlags(workspacePath: string) {
  const selection = await selectSchematic(workspacePath);
  if (!selection) {
    return;
  }

  const flags = await selectFlags(
    'generate',
    selection.positional,
    selection.options
  );

  if (flags !== undefined) {
    ngTaskProvider.executeTask({
      positional: selection.positional,
      command: 'generate',
      flags
    });
  }
}

export function selectNgCliProject(command: string, json: any) {
  const items = ngTaskProvider
    .getProjectEntries(json)
    .filter(([_, { architect }]) => Boolean(architect))
    .flatMap(([project, { architect }]) => ({ project, architect }))
    .filter(({ architect }) => Boolean(architect && architect[command]))
    .map(
      ({ project, architect }) =>
        new NgTaskQuickPickItem(project, architect![command]!, command, project)
    );

  if (!items.length) {
    window.showInformationMessage(
      `None of your projects support ng ${command}`
    );

    return;
  }

  return window.showQuickPick(items, {
    placeHolder: `Project to ${command}`
  });
}
