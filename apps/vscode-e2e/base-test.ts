import { test as base, type Page, _electron } from '@playwright/test';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';
import { ChildProcess, spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
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
  cleanupMarkerFiles,
} from './fixtures/vscode-evaluator';
import { NxConsolePage } from './page-objects/nx-console-page';

export interface LaunchOptions {
  vscodeVersion?: string;
  userSettings?: Record<string, unknown>;
  workspacePath?: string;
}

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

let xvfbProcess: ChildProcess | undefined;

function ensureXvfb(): void {
  if (process.platform !== 'linux' || process.env.DISPLAY) {
    return;
  }

  process.env.DISPLAY = ':99';
  xvfbProcess = spawn('Xvfb', [':99', '-screen', '0', '1920x1080x24'], {
    stdio: 'ignore',
    detached: true,
  });
  xvfbProcess.unref();
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
      ensureXvfb();

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

      // Clean up marker files from previous runs BEFORE launching
      cleanupMarkerFiles();

      // Launch VS Code via Playwright's Electron support
      const env = { ...process.env };
      // Critical: unset this when running from within VS Code/Claude Code
      delete env.ELECTRON_RUN_AS_NODE;

      const electronApp = await _electron.launch({
        executablePath: vscodePath,
        args: [
          '--no-sandbox',
          '--disable-gpu-sandbox',
          '--disable-updates',
          '--skip-welcome',
          '--skip-release-notes',
          '--disable-workspace-trust',
          `--extensionDevelopmentPath=${extensionDevelopmentPath}`,
          `--extensionTestsPath=${extensionTestsPath}`,
          `--extensions-dir=${extensionsDir}`,
          `--user-data-dir=${userDataDir}`,
          workspacePath,
        ],
        env,
        timeout: 60_000,
      });

      // Connect to the HTTP test server running inside the extension host.
      // The runner writes its URL to a temp file; we poll for it.
      const evaluator = new VSCodeEvaluator();
      await evaluator.connect();

      // Get the VS Code window
      const page = await electronApp.firstWindow();
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Wait for extension to activate
      await evaluator.evaluate(async (vscode) => {
        const ext = vscode.extensions.getExtension('nrwl.angular-console');
        if (ext && !ext.isActive) {
          await ext.activate();
        }
      });

      const nxConsole = new NxConsolePage(page, evaluator);

      await use({ page, nxConsole, evaluator });

      // Cleanup
      evaluator.close();
      await electronApp.close();
      await cleanupNxWorkspace(workspacePath);
      rmSync(tmpDir, { recursive: true, force: true });

      if (xvfbProcess) {
        xvfbProcess.kill();
        xvfbProcess = undefined;
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
