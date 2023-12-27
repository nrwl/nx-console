import { ExtensionContext, commands } from "vscode";
import { registerNxCommands } from "./nx-task-commands";
import { registerCliTaskCommands } from "./cli-task-commands";
import { showProjectConfiguration } from "./show-project-config-command";

export function initTasks(context: ExtensionContext ) {
    registerNxCommands(context);
    registerCliTaskCommands(context);

    commands.registerCommand('nxConsole.showProjectConfiguration', showProjectConfiguration)

}