import { gte } from '@nx-console/nx-version';
import { getPackageManagerCommand } from '@nx-console/shared-npm';
import { nxLatestProvenanceCheck } from '@nx-console/shared-utils';
import { WorkspaceConfigurationStore } from '@nx-console/vscode-configuration';
import { getNxVersion } from '@nx-console/vscode-nx-workspace';
import { vscodeLogger } from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { getWorkspacePath } from '@nx-console/vscode-utils';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  Disposable,
  ExtensionContext,
  ShellExecution,
  Task,
  TaskScope,
  tasks,
  window,
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
    );
  }, 60 * 1000);

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

export async function runConfigureAiAgentsCommand() {
  const workspacePath = getWorkspacePath();

  getTelemetry().logUsage('ai.configure-agents-setup-action', {
    source: 'command',
  });

  const pkgManagerCommands = await getPackageManagerCommand(workspacePath);
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
}

async function runAiAgentCheck() {
  if (WorkspaceConfigurationStore.instance.get('aiCheckDontAskAgain', false)) {
    return;
  }

  const now = Date.now();

  const lastUpdateNotificationTimestamp =
    WorkspaceConfigurationStore.instance.get(
      'lastAiCheckNotificationTimestamp',
      0,
    );
  const oneDayInMs = 24 * 60 * 60 * 1000;
  if (now - lastUpdateNotificationTimestamp < oneDayInMs) {
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

    const checkCommand = `${pkgManagerCommands.dlx} nx@latest configure-ai-agents --check`;

    try {
      getTelemetry().logUsage('ai.configure-agents-check');
      await promisify(exec)(checkCommand, {
        cwd: workspacePath,
        env: {
          ...process.env,
          NX_CONSOLE: 'true',
          // we're already executing from latest, we don't have to fetch latest again
          NX_AI_FILES_USE_LOCAL: 'true',
        },
      });
      getTelemetry().logUsage('ai.configure-agents-check-done');
    } catch (e) {
      vscodeLogger.log(`AI agent configuration check failed: ${e}`);

      // let's be conservative for now.
      // There are many different reasons this could fail so we want to not spam users
      const stringified = JSON.stringify(e);
      if (!stringified.includes('The following AI agents are out of date')) {
        return;
      }
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

      // Return early - we showed the update notification
      return;
    }

    // If we get here, the update check passed (no updates needed)
    // Now check if we should prompt for configuration

    const lastConfigureNotificationTimestamp =
      WorkspaceConfigurationStore.instance.get(
        'lastAiConfigureNotificationTimestamp',
        0,
      );
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
    if (now - lastConfigureNotificationTimestamp < oneWeekInMs) {
      return;
    }

    // Run the check=all command to see if configuration is needed
    const checkAllCommand = `${pkgManagerCommands.dlx} nx@latest configure-ai-agents --check=all`;

    try {
      await promisify(exec)(checkAllCommand, {
        cwd: workspacePath,
        timeout: 30000, // 30 second timeout
        env: {
          ...process.env,
          NX_CONSOLE: 'true',
          NX_AI_FILES_USE_LOCAL: 'true',
        },
      });
      // If the command succeeds, configuration exists, no need to prompt
    } catch (e) {
      // Command threw - check if it's because agents are not fully configured
      vscodeLogger.log(`AI agent configuration check=all failed: ${e}`);

      const stringified = JSON.stringify(e);
      if (
        !stringified.includes('The following agents are not fully configured')
      ) {
        return;
      }

      WorkspaceConfigurationStore.instance.set(
        'lastAiConfigureNotificationTimestamp',
        now,
      );

      getTelemetry().logUsage('ai.configure-agents-setup-notification', {
        source: 'notification',
      });

      const selection = await window.showInformationMessage(
        'Would you like to configure AI agents for your workspace?',
        'Configure',
        "Don't ask again",
      );

      if (selection === 'Configure') {
        getTelemetry().logUsage('ai.configure-agents-setup-action', {
          source: 'notification',
        });

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
