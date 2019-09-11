import { commands, ExtensionContext, tasks, window } from 'vscode';

import { NgTaskProvider } from './ng-task-provider';
import {
  WorkspaceTreeItem,
  WorkspaceRouteTitle
} from '../workspace-tree/workspace-tree-item';

const CLI_COMMAND_LIST = [
  'build',
  'lint',
  'deploy',
  'e2e',
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
}

async function selectNgCliCommandAndShowUi(
  command: string,
  n: NgTaskProvider,
  extensionPath: string
) {
  const projectName = await selectNgCliCommand(command);
  const workspacePath = n.getWorkspacePath();
  if (!projectName) {
    return;
  }

  if (!workspacePath) {
    window.showErrorMessage(
      'Angular Console requires a workspace be set to perform this action'
    );
    return;
  }

  const workspaceTreeItem = new WorkspaceTreeItem(
    workspacePath,
    `${command[0].toUpperCase()}${command.slice(1)}` as WorkspaceRouteTitle,
    extensionPath,
    projectName
  );

  commands.executeCommand(
    'angularConsole.revealWebViewPanel',
    workspaceTreeItem
  );
}

async function selectNgCliCommandAndPromptForFlags(command: string) {
  const selection = await selectNgCliCommand(command, true);
  if (!selection) {
    return;
  }

  const flags = await window.showInputBox({
    placeHolder: 'Flags (optional)'
  });

  if (typeof flags === 'string') {
    tasks.executeTask(
      ngTaskProvider.createTask({
        type: 'shell',
        projectName: selection === '--' ? undefined : selection,
        architectName: command,
        flags
      })
    );
  }
}

function selectNgCliCommand(command: string, includeDefault?: boolean) {
  const items = [
    ...(includeDefault ? ['All Projects'] : []),
    ...ngTaskProvider
      .getProjectEntries()
      .map(([projectName, { architect }]) => ({
        projectName,
        architectDef: architect && architect[command]
      }))
      .filter(({ architectDef }) => Boolean(architectDef))
      .map(({ projectName }) => projectName)
  ];

  return window.showQuickPick(items, {
    placeHolder: `Project to ${command}`
  });
}
