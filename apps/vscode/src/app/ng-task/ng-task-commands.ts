import { commands, ExtensionContext, window } from 'vscode';

import { selectSchematic } from '../select-schematic';
import {
  WorkspaceRouteTitle,
  WorkspaceTreeItem
} from '../workspace-tree/workspace-tree-item';
import { NgTaskProvider } from './ng-task-provider';
import { NgTaskQuickPickItem } from './ng-task-quick-pick-item';
import { verifyAngularJson } from '../verifyWorkspace';

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
        selectNgCliCommandAndShowUi(command, n, context.extensionPath)
      )
    );
  });

  commands.registerCommand(`angularConsole.generate`, () =>
    selectSchematicAndPromptForFlags(n.getWorkspacePath()!)
  ),
    commands.registerCommand(`angularConsole.generate.ui`, () =>
      showUi('generate', n, context.extensionPath)
    );
}

async function selectNgCliCommandAndShowUi(
  command: string,
  n: NgTaskProvider,
  extensionPath: string
) {
  showUi(command, n, extensionPath);
}

function showUi(command: string, n: NgTaskProvider, extensionPath: string) {
  const workspacePath = n.getWorkspacePath();
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

  console.log('workspaceTreeItem', workspaceTreeItem);

  commands.executeCommand(
    'angularConsole.revealWebViewPanel',
    workspaceTreeItem
  );
}

async function selectNgCliCommandAndPromptForFlags(command: string) {
  const selection = await selectNgCliProject(command);
  if (!selection) {
    return;
  }

  const flags = await window.showInputBox({
    placeHolder: 'Flags (optional)'
  });

  if (typeof flags === 'string') {
    ngTaskProvider.executeTask({
      positional: selection.projectName,
      command,
      flags: flags.trim().split(/\s+/)
    });
  }
}

async function selectSchematicAndPromptForFlags(workspacePath: string) {
  const selection = await selectSchematic(workspacePath);
  if (!selection) {
    return;
  }

  const flags = await window.showInputBox({
    placeHolder: 'Flags (optional)'
  });

  if (typeof flags === 'string') {
    ngTaskProvider.executeTask({
      positional: selection.positional,
      command: 'generate',
      flags: flags.trim().split(/\s+/)
    });
  }
}

export function selectNgCliProject(command: string) {
  const { validAngularJson, json } = verifyAngularJson(
    ngTaskProvider.getWorkspacePath()
  );
  if (!validAngularJson) {
    return;
  }

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
