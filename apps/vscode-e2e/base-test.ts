import { test as base, type Page, _electron } from '@playwright/test';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';
import { ChildProcess, spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
    savedVideoPath: join(videoDir, `${workspaceName}.webm`),
  };
}

function copyDiagnosticsArtifacts(
  workerIndex: number,
  workspaceName: string,
  userDataDir: string,
  markerId: string,
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

      // Launch VS Code via Playwright's Electron support
      const markerId = getMarkerId(workerInfo.workerIndex);
      const env = { ...process.env };
      cleanupMarkerFile(markerId);
      cleanupRunnerLog(markerId);
      // Critical: unset this when running from within VS Code/Claude Code
      delete env.ELECTRON_RUN_AS_NODE;
      env.VSCODE_E2E_MARKER_ID = markerId;
      if (xvfb.display) {
        env.DISPLAY = xvfb.display;
      }

      const evaluator = new VSCodeEvaluator(markerId);
      let electronApp: Awaited<ReturnType<typeof _electron.launch>> | undefined;
      let recordedVideo: ReturnType<Page['video']> | undefined;
      let launchError: unknown;

      try {
        electronApp = await _electron.launch({
          executablePath: vscodePath,
          args: [
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
          ],
          env,
          recordVideo,
          timeout: 60_000,
        });

        await evaluator.connect();

        const page = await electronApp.firstWindow();
        recordedVideo = page.video();
        await page.setViewportSize({ width: 1920, height: 1080 });

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
          );
        }
        evaluator.close();
        if (electronApp) {
          await electronApp.close();
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
