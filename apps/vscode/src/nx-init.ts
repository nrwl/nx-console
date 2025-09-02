import {
  noProvenanceError,
  nxLatestProvenanceCheck,
} from '@nx-console/shared-utils';
import { logAndShowError } from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { vscodeLogger } from '@nx-console/vscode-utils';
import { execSync } from 'child_process';
import {
  commands,
  ExtensionContext,
  ShellExecution,
  Task,
  tasks,
  TaskScope,
  window,
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
        const provenanceResult = await nxLatestProvenanceCheck();
        if (provenanceResult !== true) {
          getTelemetry().logUsage('misc.nx-latest-no-provenance');
          logAndShowError(noProvenanceError, provenanceResult);
          return;
        }
        const command = 'nx@latest init --ignore-scripts';
        const task = new Task(
          { type: 'nx' }, // definition
          TaskScope.Workspace, // scope
          command, // name
          'nx',
          // execution
          new ShellExecution(`npx ${command}`, {
            cwd: workspacePath,
            env: {
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
