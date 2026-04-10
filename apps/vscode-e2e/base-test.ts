import { test as base, type Page, _electron, chromium } from '@playwright/test';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';
import { ChildProcess, spawn } from 'node:child_process';
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { workspaceRoot } from 'nx/src/devkit-exports';
import {
  newWorkspace,
  simpleReactWorkspaceOptions,
  e2eCwd,
  uniq,
  cleanupNxWorkspace,
} from '@nx-console/shared-e2e-utils';
import {
  VSCodeEvaluator,
  cleanupMarkerFile,
  cleanupRunnerLog,
} from './fixtures/vscode-evaluator';
import {
  getMarkerId,
  getRunnerLogFilePath,
  getWorkerDisplay,
} from './fixtures/vscode-e2e-runtime';
import { NxConsolePage } from './page-objects/nx-console-page';

export interface LaunchOptions {
  vscodeVersion?: string;
  userSettings?: Record<string, unknown>;
  workspacePath?: string;
}

const RECORD_VSCODE_VIDEO =
  process.env.PLAYWRIGHT_VSCODE_VIDEO === '1' ||
  process.env.PLAYWRIGHT_VSCODE_VIDEO === 'true';
const VSCODE_LAUNCH_TIMEOUT = 60_000;

const DEFAULT_SETTINGS: Record<string, unknown> = {
  // Disable VS Code noise
  'telemetry.telemetryLevel': 'off',
  'update.mode': 'none',
  'extensions.autoUpdate': false,
  'workbench.tips.enabled': false,
  'workbench.startupEditor': 'none',
  'workbench.enableExperiments': false,
  'security.workspace.trust.enabled': false,
  'window.dialogStyle': 'custom',
  'window.titleBarStyle': 'custom',
  // Git must remain enabled — Nx Console depends on the Git extension API
  'git.autofetch': false,
};

function ensureXvfb(workerIndex: number): {
  display?: string;
  process?: ChildProcess;
} {
  if (process.platform !== 'linux' || process.env.DISPLAY) {
    return {};
  }

  const display = getWorkerDisplay(workerIndex);
  const xvfbProcess = spawn('Xvfb', [display, '-screen', '0', '1920x1080x24'], {
    stdio: 'ignore',
    detached: true,
  });
  xvfbProcess.unref();

  return { display, process: xvfbProcess };
}

function getVideoRecordingOptions(
  workerIndex: number,
  workspaceName: string,
): {
  recordVideo?: {
    dir: string;
    size: {
      width: number;
      height: number;
    };
  };
  savedVideoPath?: string;
} {
  if (!RECORD_VSCODE_VIDEO) {
    return {};
  }

  const videoDir = join(
    workspaceRoot,
    'dist',
    'apps',
    'vscode-e2e',
    'videos',
    `worker-${workerIndex}`,
  );
  mkdirSync(videoDir, { recursive: true });

  return {
    recordVideo: {
      dir: videoDir,
      size: { width: 1920, height: 1080 },
    },
    savedVideoPath: join(
      videoDir,
      `${workspaceName}.${process.platform === 'linux' ? 'mp4' : 'webm'}`,
    ),
  };
}

function copyDiagnosticsArtifacts(
  workerIndex: number,
  workspaceName: string,
  userDataDir: string,
  markerId: string,
  launchLogPath?: string,
  recordingLogPath?: string,
): void {
  const diagnosticsDir = join(
    workspaceRoot,
    'dist',
    'apps',
    'vscode-e2e',
    'diagnostics',
    `worker-${workerIndex}`,
    workspaceName,
  );
  mkdirSync(diagnosticsDir, { recursive: true });

  const vscodeLogsDir = join(userDataDir, 'logs');
  if (existsSync(vscodeLogsDir)) {
    cpSync(vscodeLogsDir, join(diagnosticsDir, 'logs'), { recursive: true });
  }

  const runnerLogPath = getRunnerLogFilePath(markerId);
  if (existsSync(runnerLogPath)) {
    cpSync(runnerLogPath, join(diagnosticsDir, 'runner.log'));
  }

  if (launchLogPath && existsSync(launchLogPath)) {
    cpSync(launchLogPath, join(diagnosticsDir, 'launch.log'));
  }

  if (recordingLogPath && existsSync(recordingLogPath)) {
    cpSync(recordingLogPath, join(diagnosticsDir, 'recording.log'));
  }
}

function waitForProcessLine(
  process: ChildProcess,
  regex: RegExp,
  timeoutMs: number,
): Promise<RegExpMatchArray> {
  return new Promise((resolve, reject) => {
    const stderr = process.stderr;
    if (!stderr) {
      reject(new Error('VS Code process did not expose stderr.'));
      return;
    }

    const rl = createInterface({ input: stderr });
    const timeout = setTimeout(() => {
      cleanup();
      reject(
        new Error(`Timed out waiting for VS Code process output: ${regex}`),
      );
    }, timeoutMs);

    const onExit = () => {
      cleanup();
      reject(new Error('VS Code process exited before exposing DevTools.'));
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      rl.close();
      process.off('exit', onExit);
      process.off('error', onError);
    };

    rl.on('line', (line) => {
      const match = line.match(regex);
      if (!match) {
        return;
      }
      cleanup();
      resolve(match);
    });
    process.once('exit', onExit);
    process.once('error', onError);
  });
}

async function waitForCdpPage(
  browser: Awaited<ReturnType<typeof chromium.connectOverCDP>>,
  timeoutMs: number,
): Promise<Page> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const page = browser.contexts()[0]?.pages()[0];
    if (page) {
      return page;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error('Timed out waiting for VS Code page over CDP.');
}

async function terminateProcess(process: ChildProcess): Promise<void> {
  if (process.exitCode !== null || process.killed) {
    return;
  }

  const exited = new Promise<void>((resolve) => {
    process.once('exit', () => resolve());
  });
  process.kill('SIGTERM');

  await Promise.race([
    exited,
    new Promise<void>((resolve) => {
      setTimeout(() => {
        if (process.exitCode === null && !process.killed) {
          process.kill('SIGKILL');
        }
        resolve();
      }, 5_000);
    }),
  ]);
}

function startLinuxScreenRecording(
  display: string,
  outputPath: string,
  logPath: string,
): ChildProcess {
  const recordingProcess = spawn(
    'ffmpeg',
    [
      '-y',
      '-f',
      'x11grab',
      '-video_size',
      '1920x1080',
      '-framerate',
      '15',
      '-draw_mouse',
      '1',
      '-i',
      `${display}.0`,
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-pix_fmt',
      'yuv420p',
      outputPath,
    ],
    {
      stdio: ['pipe', 'ignore', 'pipe'],
    },
  );

  recordingProcess.stderr?.on('data', (chunk: Buffer | string) => {
    appendFileSync(logPath, chunk.toString());
  });

  return recordingProcess;
}

async function stopScreenRecording(process?: ChildProcess): Promise<void> {
  if (!process || process.exitCode !== null || process.killed) {
    return;
  }

  const exited = new Promise<void>((resolve) => {
    process.once('exit', () => resolve());
  });
  process.stdin?.write('q');
  process.stdin?.end();

  await Promise.race([
    exited,
    new Promise<void>((resolve) => {
      setTimeout(() => {
        if (process.exitCode === null && !process.killed) {
          process.kill('SIGTERM');
        }
        resolve();
      }, 5_000);
    }),
  ]);
}

export const test = base.extend<
  { nxConsole: NxConsolePage },
  {
    vscodeVersion: string;
    vscode: {
      page: Page;
      nxConsole: NxConsolePage;
      evaluator: VSCodeEvaluator;
    };
  }
>({
  vscodeVersion: ['stable', { option: true, scope: 'worker' }],

  // Worker-scoped: one VS Code instance per worker
  vscode: [
    async ({ vscodeVersion }, use, workerInfo) => {
      const xvfb = ensureXvfb(workerInfo.workerIndex);

      // Download VS Code
      const vscodePath = await downloadAndUnzipVSCode(vscodeVersion);

      // Create isolated temp directory for this worker
      const tmpDir = join(
        process.platform === 'darwin'
          ? join('/', 'private', tmpdir())
          : tmpdir(),
        `vscode-e2e-worker-${workerInfo.workerIndex}`,
      );
      if (existsSync(tmpDir)) {
        rmSync(tmpDir, { recursive: true, force: true });
      }
      mkdirSync(tmpDir, { recursive: true });

      const userDataDir = join(tmpDir, 'user-data');
      const extensionsDir = join(tmpDir, 'extensions');
      mkdirSync(join(userDataDir, 'User'), { recursive: true });
      mkdirSync(extensionsDir, { recursive: true });

      // Write default settings
      writeFileSync(
        join(userDataDir, 'User', 'settings.json'),
        JSON.stringify(DEFAULT_SETTINGS, null, 2),
      );

      // Create a real Nx workspace for this worker
      const workspaceName = uniq('e2e');
      newWorkspace({
        name: workspaceName,
        options: simpleReactWorkspaceOptions,
      });
      const workspacePath = join(e2eCwd, workspaceName);
      const { recordVideo, savedVideoPath } = getVideoRecordingOptions(
        workerInfo.workerIndex,
        workspaceName,
      );

      // Extension paths
      const extensionDevelopmentPath = join(
        workspaceRoot,
        'dist',
        'apps',
        'vscode',
      );
      const extensionTestsPath = join(
        workspaceRoot,
        'dist',
        'apps',
        'vscode-e2e',
        'runner',
        'index.js',
      );

      // Launch VS Code and connect the test harness
      const markerId = getMarkerId(workerInfo.workerIndex);
      const env = { ...process.env };
      cleanupMarkerFile(markerId);
      cleanupRunnerLog(markerId);
      const launchLogPath = join(tmpDir, 'vscode-launch.log');
      const recordingLogPath = join(tmpDir, 'screen-recording.log');
      // Critical: unset this when running from within VS Code/Claude Code
      delete env.ELECTRON_RUN_AS_NODE;
      env.VSCODE_E2E_MARKER_ID = markerId;
      if (xvfb.display) {
        env.DISPLAY = xvfb.display;
      }

      const evaluator = new VSCodeEvaluator(markerId);
      let electronApp: Awaited<ReturnType<typeof _electron.launch>> | undefined;
      let browser:
        | Awaited<ReturnType<typeof chromium.connectOverCDP>>
        | undefined;
      let vscodeProcess: ChildProcess | undefined;
      let recordedVideo: ReturnType<Page['video']> | undefined;
      let screenRecordingProcess: ChildProcess | undefined;
      let launchError: unknown;
      const launchArgs = [
        '--no-sandbox',
        '--disable-gpu-sandbox',
        '--disable-updates',
        '--skip-welcome',
        '--skip-release-notes',
        '--disable-workspace-trust',
        '--log',
        'trace',
        `--extensionDevelopmentPath=${extensionDevelopmentPath}`,
        `--extensionTestsPath=${extensionTestsPath}`,
        `--extensions-dir=${extensionsDir}`,
        `--user-data-dir=${userDataDir}`,
        workspacePath,
      ];

      try {
        let page: Page;
        if (process.platform === 'linux') {
          if (savedVideoPath && env.DISPLAY) {
            screenRecordingProcess = startLinuxScreenRecording(
              env.DISPLAY,
              savedVideoPath,
              recordingLogPath,
            );
          }
          vscodeProcess = spawn(
            vscodePath,
            ['--remote-debugging-port=0', ...launchArgs],
            {
              env,
              stdio: ['ignore', 'pipe', 'pipe'],
            },
          );
          vscodeProcess.stderr?.on('data', (chunk: Buffer | string) => {
            appendFileSync(launchLogPath, chunk.toString());
          });
          const [, wsEndpoint] = await waitForProcessLine(
            vscodeProcess,
            /^DevTools listening on (ws:\/\/.*)$/,
            VSCODE_LAUNCH_TIMEOUT,
          );
          browser = await chromium.connectOverCDP(wsEndpoint, {
            timeout: VSCODE_LAUNCH_TIMEOUT,
          });
          page = await waitForCdpPage(browser, VSCODE_LAUNCH_TIMEOUT);
        } else {
          electronApp = await _electron.launch({
            executablePath: vscodePath,
            args: launchArgs,
            env,
            recordVideo,
            timeout: VSCODE_LAUNCH_TIMEOUT,
          });

          page = await electronApp.firstWindow();
        }

        await evaluator.connect();
        if (process.platform !== 'linux') {
          recordedVideo = page.video();
          await page.setViewportSize({ width: 1920, height: 1080 });
        }

        await evaluator.evaluate(async (vscode) => {
          const ext = vscode.extensions.getExtension('nrwl.angular-console');
          if (ext && !ext.isActive) {
            await ext.activate();
          }
        });

        const nxConsole = new NxConsolePage(page, evaluator);
        await use({ page, nxConsole, evaluator });
      } catch (error) {
        launchError = error;
        throw error;
      } finally {
        if (launchError) {
          copyDiagnosticsArtifacts(
            workerInfo.workerIndex,
            workspaceName,
            userDataDir,
            markerId,
            launchLogPath,
            recordingLogPath,
          );
        }
        evaluator.close();
        if (browser) {
          await browser.close().catch(() => {});
        }
        if (electronApp) {
          await electronApp.close();
        }
        if (vscodeProcess) {
          await terminateProcess(vscodeProcess);
        }
        if (screenRecordingProcess) {
          await stopScreenRecording(screenRecordingProcess);
        }
        if (recordedVideo && savedVideoPath) {
          await recordedVideo.saveAs(savedVideoPath);
          await recordedVideo.delete();
        }
        await cleanupNxWorkspace(workspacePath);
        rmSync(tmpDir, { recursive: true, force: true });

        if (xvfb.process) {
          xvfb.process.kill();
        }
      }
    },
    { scope: 'worker', timeout: 180_000 },
  ],

  // Test-scoped: exposes the NxConsolePage for each test
  nxConsole: async ({ vscode }, use) => {
    await use(vscode.nxConsole);
  },
});

export { expect } from '@playwright/test';
