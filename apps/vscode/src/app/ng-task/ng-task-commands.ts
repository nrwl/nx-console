import { commands, ExtensionContext, tasks, window } from 'vscode';

import { NgTaskProvider } from './ng-task-provider';
import {
  WorkspaceTreeItem,
  WorkspaceRouteTitle
} from '../workspace-tree/workspace-tree-item';
import { getTaskExecutionSchema } from '../workspace-tree/get-task-execution-schema';
import { Schema } from '@angular-console/schema';

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

  context.subscriptions.push(
    commands.registerCommand(
      'angularConsole.generate.ui.explorer',
      ({ fsPath }) => {
        const project = n.projectForPath(fsPath);
        selectNgCliCommandAndShowUi(
          'generate',
          n,
          context.extensionPath,
          project ? project.name : undefined
        );
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      'angularConsole.generate.explorer',
      ({ fsPath }) => {
        const project = n.projectForPath(fsPath);
        ngGenerate(n, project ? project.name : undefined);
      }
    )
  );
}

async function ngGenerate(provider: NgTaskProvider, projectName?: string) {
  if (!projectName) {
    projectName = await selectProject();
    if (!projectName) return;
  }

  const project = provider.getProjects()[projectName];
  if (!project) return;

  const workspacePath = provider.getWorkspacePath();
  if (!workspacePath) {
    window.showErrorMessage(
      'Angular Console requires a workspace be set to perform this action'
    );
    return;
  }

  const task = await getTaskExecutionSchema(
    workspacePath,
    () => provider.getProjectEntries(),
    'Generate',
    projectName
  );
  if (!task) return;

  const required = task.schema.filter(s => s.required);
  const flags = ['generate', `"${task.collection}:${task.name}"`];

  for (const s of required) {
    let flag;
    if (s.name === 'project') {
      flag = projectName;
      continue;
    } else {
      flag = await promptForSchema(s);
    }

    if (flag) {
      flags.push(s.positional ? flag : `${s.name} "${flag}"`);
    } else {
      return;
    }
  }

  const optional = await window.showInputBox({
    prompt: 'additional flags (optional)'
  });
  if (optional) flags.push(optional);

  tasks.executeTask(
    ngTaskProvider.createTask({
      type: 'shell',
      projectName: projectName,
      architectName: 'generate',
      flags: flags.join(' ')
    })
  );
}

async function promptForSchema(
  s: Schema,
  defaultValue?: string
): Promise<string | undefined> {
  const title = `${s.name}: ${s.description}`;
  let flag: string | undefined;

  if (s.enum) {
    flag = await window.showQuickPick(s.enum, {
      placeHolder: title
    });
  } else {
    flag = await window.showInputBox({
      prompt: title,
      value: defaultValue
    });
  }

  return flag;
}

async function selectNgCliCommandAndShowUi(
  command: string,
  n: NgTaskProvider,
  extensionPath: string,
  projectName?: string
) {
  if (!projectName) {
    projectName = await selectProject();
    if (!projectName) return;
  }

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

export async function selectProject() {
  const items = ngTaskProvider.getProjectEntries().map(([name, def]) => ({
    label: name,
    detail: def.root
  }));

  const selected = await window.showQuickPick(items, {
    placeHolder: 'Select Project'
  });

  return selected ? selected.label : undefined;
}
