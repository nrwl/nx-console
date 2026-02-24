import { gte } from '@nx-console/nx-version';
import {
  checkIsNxWorkspace,
  detectPackageManager,
  getPackageManagerCommand,
} from '@nx-console/shared-npm';
import { nxLatestProvenanceCheck } from '@nx-console/shared-utils';
import { WorkspaceConfigurationStore } from '@nx-console/vscode-configuration';
import {
  getConfigureAiAgentsStatus,
  getNxVersion,
} from '@nx-console/vscode-nx-workspace';
import { vscodeLogger } from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { getWorkspacePath } from '@nx-console/vscode-utils';
import { exec, spawn } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'fs';
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

const NO_AI_AGENTS_CONFIGURED_ERROR = 'No AI agents are configured';
const AI_AGENTS_OUT_OF_DATE_ERROR = 'The following AI agents are out of date';
const NOT_FULLY_CONFIGURED_ERROR =
  'The following agents are not fully configured';

const EXPECTED_ERRORS = [
  'E401',
  'E403',
  'E404',
  'ENOTFOUND',
  'ECONNRESET',
  'ECONNREFUSED',
  'EIDLETIMEOUT',
  'ETIMEDOUT',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'npm error 403',
  'npm error network',
  'npm ERR! 404',
  'npm error 502',
  'npm error 500',
  'FETCH_ERROR',
  'ERR_PNPM_UNSUPPORTED_ENGINE',
  'ERR_INVALID_AUTH',
  'ERR_SOCKET_TIMEOUT',
  'EBADENGINE',
  'This program is blocked by group policy',
  'Invalid authentication',
  'ERR_PNPM_FETCH_401',
  'GET 401',
  // windows npx handles setting peer dependencies differently
  "Cannot set properties of null (setting 'peer')",
];

let checkTimer: NodeJS.Timeout | undefined;
let intervalTimer: NodeJS.Timeout | undefined;

export function setupPeriodicAiCheck(context: ExtensionContext) {
  // Run first check after 3 minutes
  checkTimer = setTimeout(
    () => {
      runAiAgentCheck();

      // Then check every 3 hours
      intervalTimer = setInterval(
        () => {
          runAiAgentCheck();
        },
        3 * 60 * 60 * 1000,
      );
    },
    3 * 60 * 1000,
  );

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

  const command = await constructCommand('');
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

async function constructCommand(flags: string, forceNpx = false) {
  const workspacePath = getWorkspacePath();

  const hash = createHash('sha256')
    .update(workspacePath || '')
    .digest('hex')
    .slice(0, 10);

  const tmpDir = join(tmpdir(), 'nx-console-tmp', hash);

  let cacheParam = '';
  try {
    rmSync(tmpDir, { recursive: true, force: true });
    mkdirSync(tmpDir, { recursive: true });
    cacheParam = `--cache=${tmpDir}`;
  } catch (e) {
    // No permissions or can't create tmpDir, skip cache parameter
  }

  const packageManagerCommands = await getPackageManagerCommand(
    workspacePath,
    vscodeLogger,
  );

  let dlx = packageManagerCommands.dlx;

  // there are older versions of nx that have this outdated config
  // 'yarn' isn't actually a dlx command it's only for local packages
  if (dlx === 'yarn' || dlx === 'npx' || dlx === undefined) {
    dlx = `npx -y --ignore-scripts ${cacheParam}`;
  }

  return `${forceNpx ? `npx -y ${cacheParam} --ignore-scripts` : dlx} nx@latest configure-ai-agents ${flags}`.trim();
}

async function doRunAiAgentCheck(
  workspacePath: string,
  forceNpx = false,
): Promise<[string, Error][]> {
  let callbackStdout = '';
  let callbackStderr = '';
  let weKilledIt = false;
  let commandStartTime = 0;
  let commandKilledTimed = 0;
  let commandSpawnedTime = 0;
  let command = '';

  const errors: [string, Error][] = [];

  try {
    command = await constructCommand('--check', forceNpx);
    await new Promise((resolve, reject) => {
      commandStartTime = Date.now();
      const childProcess = spawn(command, {
        cwd: workspacePath,
        env: {
          ...process.env,
          NX_CONSOLE: 'true',
          // we're already executing from latest, we don't have to fetch latest again
          NX_AI_FILES_USE_LOCAL: 'true',
          NX_VERBOSE_LOGGING: 'true',
          npm_config_loglevel: 'verbose',
          NX_SKIP_VSCODE_EXTENSION_INSTALL: 'true',
        },
        shell: true,
      });

      // TODO: maybe put the timeout in here if we realize that spawning takes too long
      childProcess.on('spawn', () => {
        commandSpawnedTime = Date.now();
      });

      const timeout = setTimeout(() => {
        weKilledIt = true;
        commandKilledTimed = Date.now();
        childProcess.kill();
      }, 360000);

      childProcess.stdout?.on('data', (data) => {
        callbackStdout += data.toString();
      });

      childProcess.stderr?.on('data', (data) => {
        callbackStderr += data.toString();
      });

      childProcess.on('close', (code, signal) => {
        clearTimeout(timeout);
        if (code !== 0) {
          const error: any = new Error(`Process exited with code ${code}`);
          error.code = code;
          error.signal = signal;
          error.stdout = callbackStdout;
          error.stderr = callbackStderr;
          error.weKilledIt = weKilledIt;
          error.elapsedTime = Date.now() - commandStartTime;
          error.elapsedSpawnTime = commandSpawnedTime - commandStartTime;

          if (commandKilledTimed > 0) {
            error.elapsedKillTime = commandKilledTimed - commandStartTime;
          }
          reject(error);
        } else {
          resolve(true);
        }
      });

      childProcess.on('error', (error) => {
        clearTimeout(timeout);
        if (!(error as any).stdout) {
          (error as any).stdout = callbackStdout;
        }
        if (!(error as any).stderr) {
          (error as any).stderr = callbackStderr;
        }
        if (!(error as any).weKilledIt) {
          (error as any).weKilledIt = weKilledIt;
        }
        if (!(error as any).elapsedTime) {
          (error as any).elapsedTime = Date.now() - commandStartTime;
        }
        if (!(error as any).elapsedSpawnTime) {
          (error as any).elapsedSpawnTime =
            commandSpawnedTime - commandStartTime;
        }
        reject(error);
      });
    });
  } catch (e) {
    errors.push([command, e as Error]);

    const stringified = JSON.stringify(e);
    if (
      stringified.includes(AI_AGENTS_OUT_OF_DATE_ERROR) ||
      stringified.includes(NO_AI_AGENTS_CONFIGURED_ERROR)
    ) {
      return errors;
    }
    if (!forceNpx) {
      const rerunErrors = await doRunAiAgentCheck(workspacePath, true);
      errors.push(...rerunErrors);
    }
  }

  return errors;
}

async function getErrorInformation(
  command: string,
  e: Error,
  workspacePath: string,
) {
  const weKilledIt = (e as any).weKilledIt ?? false;
  // throw this error so that it can be tracked in rollbar - workaround while we track what's going wrong
  const nodeVersion = (await promisify(exec)('node --version')).stdout.trim();

  let npmVersion: string;
  try {
    npmVersion = (await promisify(exec)('npm --version')).stdout.trim();
  } catch {
    npmVersion = 'unknown';
  }

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

  const stderr = preserveModulePath((e as any).stderr || '').slice(-1500);

  const stdout = preserveModulePath(((e as any).stdout || '').slice(-1500));

  const originalMessage = preserveModulePath(
    ((e as any).message || '') as string,
  );

  let packageManager: string;
  try {
    packageManager = await detectPackageManager(workspacePath);
  } catch {
    packageManager = 'error';
  }

  const hash = createHash('sha256')
    .update(workspacePath || '')
    .digest('hex')
    .slice(0, 10);
  const tmpDir = join(tmpdir(), 'nx-console-tmp', hash);
  const cachedNxVersion = getCachedNxVersion(tmpDir);

  let errorMessage = [
    'AIFAIL',
    `COMMAND:${command}`,
    `ELAPSED:${((e as any).elapsedTime / 1000).toFixed(2)}s`,
    `ELAPSED_SPAWN:${((e as any).elapsedSpawnTime / 1000).toFixed(2)}s`,
    `WKI:${weKilledIt}${(e as any).elapsedKillTime ? `${((e as any).elapsedKillTime / 1000).toFixed()}s` : ''}`,
    `NODEVERSION:${nodeVersion}`,
    `NPMVERSION:${npmVersion}`,
    `LOCALNXVERSION:${localNxVersion}`,
    `CACHENXVERSION:${cachedNxVersion}`,
    `PKGMANAGER:${packageManager}`,
    `EXITCODE:${exitCode}`,
    `SIGNAL:${signal}`,
    `STDERR:${stderr}`,
    `STDOUT:${stdout}`,
    `MESSAGE:${originalMessage}`,
  ].join('|');

  errorMessage = errorMessage.replaceAll(
    'https://registry.npmjs.org/',
    'OFFICIAL_NPM_REGISTRY',
  );

  // there are certain error messages we can't do anything about
  // let's track those separately but not throw
  if (
    EXPECTED_ERRORS.some((expectedError) =>
      errorMessage.includes(expectedError),
    )
  ) {
    return;
  }

  return errorMessage;
}

async function runAiAgentCheck() {
  if (WorkspaceConfigurationStore.instance.get('aiCheckDontAskAgain', false)) {
    return;
  }

  const workspacePath = getWorkspacePath();
  if (!workspacePath) {
    return;
  }

  if (!(await checkIsNxWorkspace(workspacePath))) {
    return;
  }

  try {
    const nxVersion = await getNxVersion();
    if (nxVersion && gte(nxVersion, '22.6.0')) {
      await runAiAgentCheckViaDaemon();
    } else {
      await runAiAgentCheckLegacy();
    }
  } catch (error) {
    if ((error as any).message?.includes('AIFAIL')) {
      throw error;
    }
  }
}

async function runAiAgentCheckViaDaemon() {
  if (WorkspaceConfigurationStore.instance.get('aiCheckDontAskAgain', false)) {
    return;
  }

  const now = Date.now();

  try {
    getTelemetry().logUsage('ai.configure-agents-check-start');

    const status = await getConfigureAiAgentsStatus();

    if (!status) {
      getTelemetry().logUsage('ai.configure-agents-check-end');
      return;
    }

    if (status.outdatedAgents.length > 0) {
      const lastUpdateNotificationTimestamp =
        WorkspaceConfigurationStore.instance.get(
          'lastAiCheckNotificationTimestamp',
          0,
        );
      const gap = 12 * 60 * 60 * 1000;
      if (now - lastUpdateNotificationTimestamp < gap) {
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
        getTelemetry().logUsage('ai.configure-agents-action', {
          source: 'notification',
        });
        runConfigureAiAgentsCommand();
      } else if (selection === "Don't ask again") {
        getTelemetry().logUsage('ai.configure-agents-dont-ask-again', {
          source: 'notification',
        });
        WorkspaceConfigurationStore.instance.set('aiCheckDontAskAgain', true);
      }
      return;
    }

    getTelemetry().logUsage('ai.configure-agents-check-end');

    if (
      status.partiallyConfiguredAgents.length > 0 ||
      status.nonConfiguredAgents.length > 0
    ) {
      const lastConfigureNotificationTimestamp =
        WorkspaceConfigurationStore.instance.get(
          'lastAiConfigureNotificationTimestamp',
          0,
        );
      const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
      if (now - lastConfigureNotificationTimestamp < oneWeekInMs) {
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
        runConfigureAiAgentsCommand();
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
  }
}

async function runAiAgentCheckLegacy() {
  if (WorkspaceConfigurationStore.instance.get('aiCheckDontAskAgain', false)) {
    return;
  }

  const now = Date.now();

  const workspacePath = getWorkspacePath();
  if (!workspacePath) {
    return;
  }

  if (!(await checkIsNxWorkspace(workspacePath))) {
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

  try {
    const hasProvenance = await nxLatestProvenanceCheck(workspacePath);
    if (hasProvenance !== true) {
      return;
    }

    getTelemetry().logUsage('ai.configure-agents-check-start');
    const errors = await doRunAiAgentCheck(workspacePath);

    if (errors.length > 1) {
      // let's be conservative for now.
      // There are many different reasons this could fail so we want to not spam users
      const stringified = JSON.stringify(errors);

      // no agents -> no need to check
      if (!stringified.includes(NO_AI_AGENTS_CONFIGURED_ERROR)) {
        // unrelated error - throw, probably
        if (!stringified.includes(AI_AGENTS_OUT_OF_DATE_ERROR)) {
          const errorsWithInformation = [];
          for (const error of errors) {
            const errorInformation = await getErrorInformation(
              error[0],
              error[1],
              workspacePath,
            );
            if (errorInformation) {
              errorsWithInformation.push(errorInformation);
            }
          }
          if (errorsWithInformation.length > 1) {
            getTelemetry().logUsage('ai.configure-agents-check-error');
            throw new Error(
              `Error 1: \n ${errorsWithInformation[0]}\n\nError 2: \n ${errorsWithInformation[1]}\n`,
            );
          } else {
            getTelemetry().logUsage('ai.configure-agents-check-expected-error');
            return;
          }
        }

        const lastUpdateNotificationTimestamp =
          WorkspaceConfigurationStore.instance.get(
            'lastAiCheckNotificationTimestamp',
            0,
          );
        const gap = 12 * 60 * 60 * 1000;
        if (now - lastUpdateNotificationTimestamp < gap) {
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
          const command = await constructCommand('');
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
    }
    getTelemetry().logUsage('ai.configure-agents-check-end');

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
    const checkAllCommand = await constructCommand('--check=all');
    try {
      await promisify(exec)(checkAllCommand, {
        cwd: workspacePath,
        timeout: 360000,
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
      if (!stringified.includes(NOT_FULLY_CONFIGURED_ERROR)) {
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

        const command = await constructCommand('');
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
    if ((error as any).message.includes('AIFAIL')) {
      throw error;
    }
  }
}

function getCachedNxVersion(tmpDir: string): string {
  try {
    const npxDir = join(tmpDir, '_npx');
    if (!existsSync(npxDir)) {
      return 'not-found';
    }

    const hashDirs = readdirSync(npxDir);
    if (hashDirs.length === 0) {
      return 'not-found';
    }

    const nxPackageJsonPath = join(
      npxDir,
      hashDirs[0],
      'node_modules',
      'nx',
      'package.json',
    );

    if (!existsSync(nxPackageJsonPath)) {
      return 'not-found';
    }

    const nxPackageJson = JSON.parse(readFileSync(nxPackageJsonPath, 'utf-8'));
    return nxPackageJson.version || 'unknown';
  } catch (e) {
    return 'error';
  }
}
