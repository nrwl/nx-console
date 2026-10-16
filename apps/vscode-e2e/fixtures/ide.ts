import { chromium, type Browser, type Page } from '@playwright/test';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';
import { spawn, type ChildProcess } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { workspaceRoot } from 'nx/src/devkit-exports';
import { NxConsolePage } from '../page-objects/nx-console-page';
import { startDisplay } from './display';
import type { ExtensionInfo } from './extension';
import {
  DEFAULT_VSCODE_VERSION,
  EXTENSION_ID,
  parseDevToolsUrl,
  resolveVSCodeExecutable,
} from './vscode-e2e-runtime';
import { VSCodeEvaluator, cleanupMarkerFile } from './vscode-evaluator';
import {
  getWorkspaceFixture,
  stopNxDaemon,
  type FixtureContext,
} from './workspaces';

export const AUTOMATION_IDE_DIR = join(
  workspaceRoot,
  'dist/apps/vscode-e2e/automation-ide',
);
export const SESSION_FILE = join(AUTOMATION_IDE_DIR, 'session.json');
export const RUNNER_PATH = join(
  workspaceRoot,
  'dist/apps/vscode-e2e/runner/index.js',
);

const DEFAULT_SETTINGS = {
  'telemetry.telemetryLevel': 'off',
  'update.mode': 'none',
  'extensions.autoUpdate': false,
  'workbench.tips.enabled': false,
  'workbench.startupEditor': 'none',
  'workbench.enableExperiments': false,
  'security.workspace.trust.enabled': false,
  'window.dialogStyle': 'custom',
  'window.titleBarStyle': 'custom',
  // Git must remain enabled: Nx Console depends on the Git extension API.
  'git.autofetch': false,
  // Proof files live in the Nx Console repository; don't offer to open it.
  'git.openRepositoryInParentFolders': 'never',
  'workbench.colorTheme': 'Default Dark Modern',
  'editor.fontSize': 18,
  'editor.minimap.enabled': false,
  'window.zoomLevel': 0,
  'chat.disableAIFeatures': true,
};

export interface IdeSession {
  pid: number;
  cdpUrl: string;
  markerId: string;
  token: string;
  worktree: string;
  workspacePath: string;
  fixture?: string;
  extension: ExtensionInfo;
  vscodeVersion: string;
  executable: string;
  userDataDir: string;
  startedAt: string;
}

export interface LaunchIdeOptions {
  /** Keep this path short: VS Code creates IPC sockets under it, and macOS limits socket paths to 104 bytes. */
  sandboxDir: string;
  executable: string;
  vscodeVersion: string;
  extension: ExtensionInfo;
  fixture?: string;
  fixtureContext?: FixtureContext;
  workspacePath?: string;
  userSettings?: Record<string, unknown>;
  log: (text: string) => void;
}

export interface LaunchedIde {
  session: IdeSession;
  process: ChildProcess;
  /** Stops VS Code and everything the launch created; returns cleanup failures. */
  stop(): Promise<string[]>;
}

export interface ConnectedIde {
  browser: Browser;
  page: Page;
  evaluator: VSCodeEvaluator;
  nxConsole: NxConsolePage;
  disconnect(): Promise<void>;
}

export async function prepareVSCode(): Promise<{
  executable: string;
  vscodeVersion: string;
}> {
  const vscodeVersion =
    process.env.VSCODE_E2E_VERSION || DEFAULT_VSCODE_VERSION;
  const executable = resolveVSCodeExecutable(
    process.env.VSCODE_E2E_BINARY_PATH ||
      (await downloadAndUnzipVSCode(vscodeVersion)),
  );
  return { executable, vscodeVersion };
}

function shortTempRoot(): string {
  return process.platform === 'darwin' ? '/tmp' : tmpdir();
}

export function createSandboxDir(): string {
  return realpathSync(mkdtempSync(join(shortTempRoot(), 'nxc-')));
}

export function getPersistentSandboxDir(): string {
  const hash = createHash('sha256').update(workspaceRoot).digest('hex');
  const dir = join(shortTempRoot(), `nxc-ide-${hash.slice(0, 8)}`);
  mkdirSync(dir, { recursive: true });
  return realpathSync(dir);
}

export async function launchIde(
  options: LaunchIdeOptions,
): Promise<LaunchedIde> {
  const { sandboxDir, log } = options;
  const userDataDir = join(sandboxDir, 'user-data');
  const extensionsDir = join(sandboxDir, 'extensions');
  mkdirSync(join(userDataDir, 'User'), { recursive: true });
  mkdirSync(extensionsDir, { recursive: true });

  const fixtureName = options.workspacePath
    ? undefined
    : (options.fixture ?? 'demo');
  const fixture = fixtureName ? getWorkspaceFixture(fixtureName) : undefined;
  const workspacePath = options.workspacePath ?? join(sandboxDir, 'workspace');
  if (fixture) {
    rmSync(workspacePath, { recursive: true, force: true });
    mkdirSync(workspacePath, { recursive: true });
    fixture.create(workspacePath, options.fixtureContext ?? {});
  }
  if (!existsSync(join(workspacePath, 'node_modules', 'nx'))) {
    throw new Error(
      `The workspace needs its dependencies installed: ${workspacePath}`,
    );
  }
  writeFileSync(
    join(userDataDir, 'User', 'settings.json'),
    JSON.stringify(
      { ...DEFAULT_SETTINGS, ...fixture?.settings, ...options.userSettings },
      null,
      2,
    ),
  );

  const markerId = randomUUID();
  const token = randomUUID();
  cleanupMarkerFile(markerId);
  const display = await startDisplay(log);

  // The IDE should behave like a user's editor, not inherit the Nx task or agent environment of the caller.
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!/^(NX_|CLAUDECODE|OPENCODE|ELECTRON_RUN_AS_NODE$|CI$)/.test(key)) {
      env[key] = value;
    }
  }
  Object.assign(env, { NX_NO_CLOUD: 'true' }, fixture?.env, {
    VSCODE_E2E_MARKER_ID: markerId,
    VSCODE_E2E_TOKEN: token,
  });
  if (display.display) env.DISPLAY = display.display;

  const child = spawn(
    options.executable,
    [
      '--no-sandbox',
      '--disable-gpu-sandbox',
      '--disable-updates',
      '--skip-welcome',
      '--skip-release-notes',
      '--disable-workspace-trust',
      '--remote-debugging-port=0',
      `--extensionDevelopmentPath=${options.extension.path}`,
      `--extensionTestsPath=${RUNNER_PATH}`,
      `--extensions-dir=${extensionsDir}`,
      `--user-data-dir=${userDataDir}`,
      workspacePath,
    ],
    {
      env,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  const exited = new Promise<void>((resolve) =>
    child.once('exit', () => resolve()),
  );

  const signal = (name: NodeJS.Signals, group: boolean) => {
    if (!child.pid) return;
    try {
      // VS Code's helpers, extension host and language server share its process group.
      process.kill(
        group && process.platform !== 'win32' ? -child.pid : child.pid,
        name,
      );
    } catch {
      // Already exited.
    }
  };
  const waitForExit = (timeout: number) =>
    Promise.race([
      exited.then(() => true),
      new Promise<boolean>((resolve) =>
        setTimeout(() => resolve(false), timeout),
      ),
    ]);

  const stop = async (): Promise<string[]> => {
    const errors: string[] = [];
    if (child.exitCode === null && child.signalCode === null) {
      // Signal only the main process first so VS Code stops its extension host and flushes logs.
      signal('SIGTERM', false);
      if (!(await waitForExit(10_000))) {
        signal('SIGKILL', true);
        await waitForExit(5_000);
      }
    }
    signal('SIGTERM', true);
    if (fixture) {
      try {
        stopNxDaemon(workspacePath);
      } catch (error) {
        errors.push(`stop Nx daemon: ${error}`);
      }
    }
    display.close();
    cleanupMarkerFile(markerId);
    return errors;
  };

  try {
    const cdpUrl = await new Promise<string>((resolve, reject) => {
      let output = '';
      let found = false;
      const timer = setTimeout(
        () =>
          reject(
            new Error(
              'VS Code did not open a DevTools endpoint within 60 seconds',
            ),
          ),
        60_000,
      );
      const onData = (data: Buffer) => {
        const text = data.toString();
        log(text);
        if (found) return;
        output += text;
        const url = parseDevToolsUrl(output);
        if (url) {
          found = true;
          clearTimeout(timer);
          resolve(url);
        }
      };
      child.stdout?.on('data', onData);
      child.stderr?.on('data', onData);
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once('exit', (code, signalName) => {
        clearTimeout(timer);
        reject(
          new Error(`VS Code exited during startup (${code ?? signalName})`),
        );
      });
    });

    return {
      process: child,
      stop,
      session: {
        pid: child.pid!,
        cdpUrl,
        markerId,
        token,
        worktree: workspaceRoot,
        workspacePath,
        fixture: fixtureName,
        extension: options.extension,
        vscodeVersion: options.vscodeVersion,
        executable: options.executable,
        userDataDir,
        startedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    await stop();
    throw error;
  }
}

export async function connectIde(
  session: IdeSession,
  timeout = 90_000,
): Promise<ConnectedIde> {
  const browser = await chromium.connectOverCDP(session.cdpUrl, {
    timeout: 30_000,
  });
  try {
    const page = await findWorkbench(browser, timeout);
    const evaluator = new VSCodeEvaluator(session.markerId, session.token);
    await evaluator.connect();
    await evaluator.evaluate(async (vscode, id: string) => {
      const extension = vscode.extensions.getExtension(id);
      if (!extension) {
        throw new Error(`${id} is not loaded in this VS Code window`);
      }
      await extension.activate();
    }, EXTENSION_ID);
    return {
      browser,
      page,
      evaluator,
      nxConsole: new NxConsolePage(page, evaluator),
      disconnect: async () => {
        // Closing a browser obtained through connectOverCDP only disconnects from it.
        await browser.close();
      },
    };
  } catch (error) {
    await browser.close().catch(() => undefined);
    throw error;
  }
}

async function findWorkbench(browser: Browser, timeout: number): Promise<Page> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const context of browser.contexts()) {
      const page = context
        .pages()
        .find((candidate) => candidate.url().includes('workbench'));
      if (page) return page;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('The VS Code workbench window did not open');
}

export function writeSession(session: IdeSession): void {
  mkdirSync(AUTOMATION_IDE_DIR, { recursive: true });
  writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));
}

/** Returns the running automation IDE of this worktree, if any. */
export function readSession(): IdeSession | undefined {
  if (!existsSync(SESSION_FILE)) return undefined;
  const session = JSON.parse(readFileSync(SESSION_FILE, 'utf8')) as IdeSession;
  try {
    process.kill(session.pid, 0);
  } catch {
    return undefined;
  }
  if (session.worktree !== workspaceRoot) {
    throw new Error(
      `${SESSION_FILE} belongs to ${session.worktree}, not ${workspaceRoot}`,
    );
  }
  return session;
}
