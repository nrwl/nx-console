import { ExtensionContext } from 'vscode';
import { registerCliTaskCommands } from './cli-task-commands';
import { registerNxCommands } from './nx-task-commands';

export function initTasks(context: ExtensionContext) {
  registerNxCommands(context);
  registerCliTaskCommands(context);
}
