import { getPackageManagerCommand } from '@nx-console/shared-npm';
import { nxLatestProvenanceCheck } from '@nx-console/shared-utils';
import { WorkspaceConfigurationStore } from '@nx-console/vscode-configuration';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { getWorkspacePath } from '@nx-console/vscode-utils';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  ExtensionContext,
  window,
  Disposable,
  ShellExecution,
  Task,
  TaskScope,
  tasks,
} from 'vscode';

let checkTimer: NodeJS.Timeout | undefined;
let intervalTimer: NodeJS.Timeout | undefined;

export function setupPeriodicAiCheck(context: ExtensionContext) {
  if (WorkspaceConfigurationStore.instance.get('aiCheckDontAskAgain', false)) {
    return;
  }

  // Run first check after 1 minute
  checkTimer = setTimeout(() => {
    runAiAgentCheck();

    // Then check every hour
    intervalTimer = setInterval(
      () => {
        runAiAgentCheck();
      },
      60 * 60 * 1000,
    ); // 1 hour
  }, 60 * 1000); // 1 minute

  // Clean up timers on deactivate
  context.subscriptions.push(
    new Disposable(() => {
      if (checkTimer) {
        clearTimeout(checkTimer);
      }
      if (intervalTimer) {
        clearInterval(intervalTimer);
      }
    }),
  );
}

async function runAiAgentCheck() {
  // Check if user has disabled notifications
  if (WorkspaceConfigurationStore.instance.get('aiCheckDontAskAgain', false)) {
    return;
  }

  // Check if we already showed a notification within the last 24 hours
  const lastNotificationTimestamp = WorkspaceConfigurationStore.instance.get(
    'lastAiCheckNotificationTimestamp',
    0,
  );
  const now = Date.now();
  const oneDayInMs = 24 * 60 * 60 * 1000;
  if (now - lastNotificationTimestamp < oneDayInMs) {
    return;
  }

  const workspacePath = getWorkspacePath();
  if (!workspacePath) {
    return;
  }

  try {
    const pkgManagerCommands = await getPackageManagerCommand(workspacePath);

    const hasProvenance = await nxLatestProvenanceCheck();

    if (hasProvenance !== true) {
      return;
    }
    const command = `${pkgManagerCommands.dlx} nx@latest configure-ai-agents --check`;

    try {
      await promisify(exec)(command, {
        cwd: workspacePath,
        env: {
          ...process.env,
          NX_CONSOLE: 'true',
          NX_AI_FILES_USE_LOCAL: 'true',
        },
      });
    } catch {
      WorkspaceConfigurationStore.instance.set(
        'lastAiCheckNotificationTimestamp',
        now,
      );

      getTelemetry().logUsage('ai.configure-agents-check-notification', {
        source: 'notification',
      });

      const selection = await window.showInformationMessage(
        'Your AI agent configuration is outdated. Would you like to update to the recommended configuration?',
        'Update',
        "Don't ask again",
      );

      if (selection === 'Update') {
        // Log telemetry for action taken
        getTelemetry().logUsage('ai.configure-agents-action', {
          source: 'notification',
        });

        // Run the configure command
        const configureCommand = `nx@latest configure-ai-agents`;
        const task = new Task(
          { type: 'nx' },
          TaskScope.Workspace,
          configureCommand,
          'nx',
          new ShellExecution(`${pkgManagerCommands.dlx} ${configureCommand}`, {
            cwd: workspacePath,
            env: {
              ...process.env,
              NX_CONSOLE: 'true',
              NX_AI_FILES_USE_LOCAL: 'true',
            },
          }),
        );
        task.presentationOptions.focus = true;
        tasks.executeTask(task);
      } else if (selection === "Don't ask again") {
        getTelemetry().logUsage('ai.configure-agents-dont-ask-again', {
          source: 'notification',
        });

        WorkspaceConfigurationStore.instance.set('aiCheckDontAskAgain', true);
      }
    }
  } catch (error) {
    // Silently fail - this is a non-critical background check
  }
}
