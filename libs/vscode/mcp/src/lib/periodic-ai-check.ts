import { gte } from '@nx-console/nx-version';
import { detectPackageManager } from '@nx-console/shared-npm';
import { nxLatestProvenanceCheck } from '@nx-console/shared-utils';
import { WorkspaceConfigurationStore } from '@nx-console/vscode-configuration';
import { getNxVersion } from '@nx-console/vscode-nx-workspace';
import { vscodeLogger } from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { getWorkspacePath } from '@nx-console/vscode-utils';
import { exec } from 'child_process';
import { createHash } from 'crypto';
import { rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import {
  commands,
  Disposable,
  ExtensionContext,
  ShellExecution,
  Task,
  tasks,
  TaskScope,
  window,
} from 'vscode';

let checkTimer: NodeJS.Timeout | undefined;
let intervalTimer: NodeJS.Timeout | undefined;

export function setupPeriodicAiCheck(context: ExtensionContext) {
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

  const command = constructCommand('');
  const task = new Task(
    { type: 'nx' },
    TaskScope.Workspace,
    command,
    'nx',
    new ShellExecution(command, {
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

function constructCommand(flags: string) {
  const workspacePath = getWorkspacePath();

  // Create unique cache per workspace to avoid collisions
  const hash = createHash('sha256')
    .update(workspacePath || '')
    .digest('hex')
    .slice(0, 10);

  const tmpDir = join(tmpdir(), 'nx-console-tmp', hash);
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch (e) {
    // ignore
  }
  return `npx -y --cache=${tmpDir} --ignore-scripts nx@latest configure-ai-agents ${flags}`;
}

async function getNxLatestVersion(): Promise<string | undefined> {
  try {
    const result = await promisify(exec)('npm view nx@latest version', {
      encoding: 'utf-8',
      timeout: 10000,
    });
    return result.stdout.trim();
  } catch (e) {
    vscodeLogger.log(`Failed to get nx@latest version: ${e}`);
    return undefined;
  }
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
  const gap = 12 * 60 * 60 * 1000;
  if (now - lastUpdateNotificationTimestamp < gap) {
    return;
  }

  const workspacePath = getWorkspacePath();
  if (!workspacePath) {
    return;
  }

  // Check Node version - only run on Node 20+
  try {
    const nodeVersion = (await promisify(exec)('node --version')).stdout.trim();
    const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
    if (majorVersion < 20) {
      return;
    }
  } catch (e) {
    return;
  }

  // Check nx@latest version - only run if >= 22 (when configure-ai-agents was added)
  const nxLatestVersion = await getNxLatestVersion();
  if (!nxLatestVersion || !gte(nxLatestVersion, '22.0.0')) {
    return;
  }

  try {
    const hasProvenance = await nxLatestProvenanceCheck();
    if (hasProvenance !== true) {
      return;
    }

    try {
      getTelemetry().logUsage('ai.configure-agents-check-start');
      await promisify(exec)(constructCommand('--check'), {
        cwd: workspacePath,
        timeout: 120000,
        env: {
          ...process.env,
          NX_CONSOLE: 'true',
          // we're already executing from latest, we don't have to fetch latest again
          NX_AI_FILES_USE_LOCAL: 'true',
        },
      });
      getTelemetry().logUsage('ai.configure-agents-check-end');
      WorkspaceConfigurationStore.instance.set(
        'lastAiCheckNotificationTimestamp',
        now,
      );
    } catch (e) {
      vscodeLogger.log(`AI agent configuration check failed: ${e}`);

      // let's be conservative for now.
      // There are many different reasons this could fail so we want to not spam users
      const stringified = JSON.stringify(e);
      if (!stringified.includes('The following AI agents are out of date')) {
        getTelemetry().logUsage('ai.configure-agents-check-error');
        // throw this error so that it can be tracked in rollbar - workaround while we track what's going wrong
        const nodeVersion = (
          await promisify(exec)('node --version')
        ).stdout.trim();

        const localNxVersion = (await getNxVersion())?.full;

        const exitCode = (e as any).code ?? 'unknown';
        const signal = (e as any).signal ?? 'null';

        const preserveModulePath = (text: string) =>
          text.replace(
            /Cannot find module ['"](.+?)['"]/g,
            (_match: string, modulePath: string) => {
              return `Cannot find module ${modulePath.replace(/\//g, '&')}`;
            },
          );

        const stderr = ((e as any).stderr || '').slice(-500);

        const stdout = preserveModulePath(
          ((e as any).stdout || '').slice(-500),
        );

        const originalMessage = preserveModulePath(
          ((e as any).message || '') as string,
        );

        let packageManager: string;
        try {
          packageManager = await detectPackageManager(workspacePath);
        } catch {
          packageManager = 'error';
        }

        const errorMessage = [
          'AIFAIL',
          `NODEVERSION:${nodeVersion}`,
          `NXVERSION:${nxLatestVersion}`,
          `LOCALNXVERSION:${localNxVersion}`,
          `PKGMANAGER:${packageManager}`,
          `EXITCODE:${exitCode}`,
          `SIGNAL:${signal}`,
          `STDERR:${stderr}`,
          `STDOUT:${stdout}`,
          `MESSAGE:${originalMessage}`,
        ].join('|');

        // there are certain error messages we can't do anything about
        // let's track those separately but not throw
        if (
          errorMessage.includes('E401') ||
          errorMessage.includes('E403') ||
          errorMessage.includes('E404') ||
          errorMessage.includes('ENOTFOUND') ||
          errorMessage.includes('ECONNRESET')
        ) {
          getTelemetry().logUsage('ai.configure-agents-check-expected-error');
          return;
        }

        throw new Error(errorMessage, {
          cause: e as Error,
        });
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
        const command = constructCommand('');
        const task = new Task(
          { type: 'nx' },
          TaskScope.Workspace,
          command,
          'nx',
          new ShellExecution(command, {
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
    const checkAllCommand = constructCommand('--check=all');
    try {
      await promisify(exec)(checkAllCommand, {
        cwd: workspacePath,
        timeout: 120000,
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
        'Want Nx to configure your AI agents and MCP setup?',
        'Yes',
        'Learn more',
        "Don't ask again",
      );

      if (selection === 'Yes') {
        getTelemetry().logUsage('ai.configure-agents-setup-action', {
          source: 'notification',
        });

        const command = constructCommand('');
        const task = new Task(
          { type: 'nx' },
          TaskScope.Workspace,
          command,
          'nx',
          new ShellExecution(command, {
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
      } else if (selection === 'Learn more') {
        getTelemetry().logUsage('ai.configure-agents-learn-more', {
          source: 'notification',
        });

        commands.executeCommand(
          'vscode.open',
          'https://nx.dev/docs/getting-started/ai-setup#configure-nx-ai-integration',
        );
      } else if (selection === "Don't ask again") {
        getTelemetry().logUsage('ai.configure-agents-dont-ask-again', {
          source: 'notification',
        });

        WorkspaceConfigurationStore.instance.set('aiCheckDontAskAgain', true);
      }
    }
  } catch (error) {
    // Silently fail - this is a non-critical background check
    // the one exception is AIFAIL errors which we want to track in rollbar
    if ((error as any).message.startsWith('AIFAIL')) {
      throw error;
    }
  }
}
