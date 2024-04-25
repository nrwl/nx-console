import {
  getNxWorkspacePath,
  GlobalConfigurationStore,
} from '@nx-console/vscode/configuration';
import { getNxWorkspace } from '@nx-console/vscode/nx-workspace';
import {
  AbstractTreeProvider,
  getShellExecutionForConfig,
  logAndShowTaskCreationError,
} from '@nx-console/vscode/utils';
import { commands, ExtensionContext, Task, tasks, TaskScope } from 'vscode';
import { NxCommandConfig, NxCommandsTreeItem } from './nx-commands-tree-item';
import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';
import { importNxPackagePath } from '@nx-console/shared/npm';

export const EXECUTE_ARBITRARY_COMMAND = 'nxConsole.executeArbitraryCommand';

export class NxCommandsTreeProvider extends AbstractTreeProvider<NxCommandsTreeItem> {
  constructor(private readonly context: ExtensionContext) {
    super();
    commands.registerCommand(
      EXECUTE_ARBITRARY_COMMAND,
      this.executeArbitraryCommand
    );
    GlobalConfigurationStore.instance.onConfigurationChange(() =>
      this.refresh()
    );

    onWorkspaceRefreshed(() => this.refresh());
  }

  getParent(_: NxCommandsTreeItem) {
    return null;
  }

  async getChildren() {
    const commonCommands = GlobalConfigurationStore.instance.get<string[]>(
      'commonNxCommands',
      []
    );
    const vscodeCommands = new Set(await commands.getCommands(true));
    const availableCommands: NxCommandConfig[] = commonCommands.map(
      (command) => {
        const transformedCommand = `nx.${command.replace(':', '.')}`;
        if (vscodeCommands.has(transformedCommand)) {
          return {
            command: transformedCommand,
            type: 'vscode-command',
            label: command,
          };
        }
        if (command === 'add-dependency') {
          return {
            type: 'add-dependency',
            command: 'nxConsole.addDependency',
            label: 'Add Dependency',
          };
        }
        if (command === 'add-dev-dependency') {
          return {
            type: 'add-dev-dependency',
            command: 'nxConsole.addDevDependency',
            label: 'Add Dev Dependency',
          };
        }
        return {
          command,
          type: 'arbitrary-command',
          label: command,
        };
      }
    );

    return availableCommands.map(
      (c) => new NxCommandsTreeItem(c, this.context.extensionPath)
    );
  }

  async executeArbitraryCommand(command: string) {
    const prefixedCommand = command.startsWith('nx ')
      ? command
      : `nx ${command}`;
    const workspacePath = getNxWorkspacePath();
    const isEncapsulatedNx =
      (await getNxWorkspace())?.isEncapsulatedNx ?? false;
    const { detectPackageManager } = await importNxPackagePath<
      typeof import('nx/src/devkit-exports')
    >(workspacePath, 'src/devkit-exports');
    const pkgManager = detectPackageManager(workspacePath);

    try {
      const task = new Task(
        { type: 'nx' },
        TaskScope.Workspace,
        prefixedCommand,
        pkgManager,
        await getShellExecutionForConfig({
          cwd: workspacePath,
          displayCommand: prefixedCommand,
          encapsulatedNx: isEncapsulatedNx,
        })
      );
      tasks.executeTask(task);
    } catch (e) {
      logAndShowTaskCreationError(e);
      return;
    }
  }
}
