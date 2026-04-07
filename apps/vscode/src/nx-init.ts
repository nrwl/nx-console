import {
  buildSafeDlxCommand,
  getPackageManagerCommand,
} from '@nx-console/shared-npm';
import {
  noProvenanceError,
  nxLatestProvenanceCheck,
} from '@nx-console/shared-utils';
import { logAndShowError } from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import {
  commands,
  ExtensionContext,
  ShellExecution,
  Task,
  tasks,
  TaskScope,
  workspace,
} from 'vscode';

export function initNxInit(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(
      'nx.init',
      async (triggeredFromAngularMigrate?: boolean) => {
        getTelemetry().logUsage('cli.init', {
          source:
            triggeredFromAngularMigrate === true
              ? 'migrate-angular-prompt'
              : undefined,
        });
        const workspacePath =
          workspace.workspaceFolders &&
          workspace.workspaceFolders[0].uri.fsPath;
        const provenanceResult = await nxLatestProvenanceCheck(workspacePath);
        if (provenanceResult !== true) {
          getTelemetry().logUsage('misc.nx-latest-no-provenance');
          logAndShowError(noProvenanceError, provenanceResult);
          return;
        }
        const packageManagerCommand = await getPackageManagerCommand(
          workspacePath ?? '',
        );
        const { prefix, env } = buildSafeDlxCommand(
          packageManagerCommand.dlx,
        );
        const command = `${prefix} nx@latest init`;
        const task = new Task(
          { type: 'nx' },
          TaskScope.Workspace,
          command,
          'nx',
          new ShellExecution(command, {
            cwd: workspacePath,
            env: {
              ...process.env,
              ...env,
              NX_CONSOLE: 'true',
            },
          }),
        );
        task.presentationOptions.focus = true;

        tasks.executeTask(task);
      },
    ),
  );
}
