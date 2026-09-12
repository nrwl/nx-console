import { test as base, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { workspaceRoot } from 'nx/src/devkit-exports';
import type { ExtensionInfo } from './fixtures/extension';
import {
  connectIde,
  createSandboxDir,
  launchIde,
  readSession,
  type ConnectedIde,
  type IdeSession,
  type LaunchedIde,
} from './fixtures/ide';
import { ProofLog } from './fixtures/proof';
import { ScreencastRecorder } from './fixtures/screencast';
import { isEnabled, validateLabel } from './fixtures/vscode-e2e-runtime';
import type { VSCodeEvaluator } from './fixtures/vscode-evaluator';
import type { FixtureContext } from './fixtures/workspaces';
import { NxConsolePage } from './page-objects/nx-console-page';

export interface LaunchOptions {
  /** A fixture from fixtures/workspaces.ts; defaults to `demo`. */
  fixture?: string;
  /** Values the fixture needs at creation time. Scenarios that set this always launch their own IDE. */
  fixtureContext?: FixtureContext;
  userSettings?: Record<string, unknown>;
}

export interface VSCodeSession {
  page: Page;
  nxConsole: NxConsolePage;
  evaluator: VSCodeEvaluator;
  workspacePath: string;
  extension: ExtensionInfo;
  /** Which Nx Console build is under test, for proof headings. */
  build: string;
  label: string;
  /** Creates the editor that shows a scenario's measured results in its recording. */
  proof(heading: string[]): ProofLog;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Run scenarios through yarn nx run vscode-e2e:e2e so global setup can prepare VS Code.`,
    );
  }
  return value;
}

function sourceState() {
  const git = (args: string[]) =>
    execFileSync('git', args, {
      cwd: workspaceRoot,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  return {
    revision: git(['rev-parse', 'HEAD']).trim(),
    sourceDirty: git(['status', '--porcelain']).trim().length > 0,
    sourceDiffSha256: createHash('sha256')
      .update(git(['diff', 'HEAD']))
      .digest('hex'),
  };
}

const stripAnsi = (text: string) => text.replace(/\u001b\[[0-9;]*m/g, '');

function describeBuild(
  extension: ExtensionInfo,
  source: { revision: string; sourceDirty: boolean },
): string {
  if (extension.source === 'workspace') {
    return `Nx Console built from ${source.revision.slice(0, 8)}${source.sourceDirty ? ' with uncommitted changes' : ''}`;
  }
  if (extension.source === 'marketplace') {
    return `Nx Console ${extension.version} from the Marketplace`;
  }
  return `Nx Console ${extension.version} from ${extension.path}`;
}

export const test = base.extend<{
  vscodeOptions: LaunchOptions;
  vscode: VSCodeSession;
  nxConsole: NxConsolePage;
}>({
  vscodeOptions: [{}, { option: true }],

  vscode: [
    async ({ vscodeOptions }, use, testInfo) => {
      const outputDir = testInfo.outputPath();
      mkdirSync(outputDir, { recursive: true });
      const log = (text: string) =>
        appendFileSync(
          join(outputDir, 'ide.log'),
          text.endsWith('\n') ? text : `${text}\n`,
        );
      const label = validateLabel(process.env.NX_AUTOMATION_LABEL || 'run');
      const record = isEnabled(process.env.PLAYWRIGHT_VSCODE_VIDEO);
      const attach = isEnabled(process.env.VSCODE_E2E_ATTACH);
      const fixture = vscodeOptions.fixture ?? 'demo';
      const cleanupErrors: string[] = [];
      const attempt = async (name: string, action: () => unknown) => {
        try {
          await action();
        } catch (error) {
          cleanupErrors.push(`${name}: ${error}`);
          log(`${name}: ${error}`);
        }
      };
      const source = sourceState();
      const metadata: Record<string, unknown> = {
        label,
        scenario: testInfo.titlePath.slice(1).join(' › '),
        mode: attach ? 'attach' : 'launch',
        fixture,
        platform: `${process.platform}-${process.arch}`,
        ...source,
        startedAt: new Date().toISOString(),
      };

      let setupError: unknown;
      let launched: LaunchedIde | undefined;
      let sandboxDir: string | undefined;
      let session: IdeSession | undefined;
      let ide: ConnectedIde | undefined;
      let tracing = false;
      let recorder: ScreencastRecorder | undefined;

      try {
        if (attach) {
          session = readSession();
          if (!session) {
            throw new Error(
              'No automation IDE is running for this worktree. Start one with yarn nx run vscode-e2e:automation-ide.',
            );
          }
          if (vscodeOptions.fixtureContext) {
            throw new Error(
              `"${testInfo.title}" launches its own IDE. Run it without VSCODE_E2E_ATTACH.`,
            );
          }
          if (session.fixture !== fixture) {
            throw new Error(
              `The automation IDE opened ${session.fixture ? `fixture "${session.fixture}"` : session.workspacePath}, but "${testInfo.title}" needs fixture "${fixture}". Relaunch it with --fixture=${fixture}.`,
            );
          }
        } else {
          sandboxDir = createSandboxDir();
          launched = await launchIde({
            sandboxDir,
            log,
            fixture,
            fixtureContext: vscodeOptions.fixtureContext,
            userSettings: vscodeOptions.userSettings,
            executable: requiredEnv('VSCODE_E2E_BINARY_PATH'),
            vscodeVersion: requiredEnv('VSCODE_E2E_VSCODE_VERSION'),
            extension: JSON.parse(requiredEnv('VSCODE_E2E_EXTENSION_INFO')),
          });
          session = launched.session;
        }
        Object.assign(metadata, {
          extension: session.extension,
          vscodeVersion: session.vscodeVersion,
          executable: session.executable,
          workspacePath: session.workspacePath,
        });
        writeFileSync(
          join(outputDir, 'metadata.json'),
          JSON.stringify(metadata, null, 2),
        );

        ide = await connectIde(session);
        if (!attach || record) {
          await ide.page
            .setViewportSize({ width: 1920, height: 1080 })
            .catch((error) => log(`set viewport: ${error}`));
        }
        await ide.page
          .context()
          .tracing.start({ screenshots: true, snapshots: true })
          .then(
            () => (tracing = true),
            (error) => log(`start trace: ${error}`),
          );
        if (record) {
          recorder = await ScreencastRecorder.start(
            ide.page,
            join(outputDir, 'frames'),
          );
        }

        const connected = ide;
        const connectedSession = session;
        const pauseMs = Number(
          process.env.VSCODE_E2E_PROOF_PAUSE_MS ?? (record ? 1500 : 0),
        );
        await use({
          page: connected.page,
          nxConsole: connected.nxConsole,
          evaluator: connected.evaluator,
          workspacePath: connectedSession.workspacePath,
          extension: connectedSession.extension,
          build: describeBuild(connectedSession.extension, source),
          label,
          proof: (heading) =>
            new ProofLog(
              connected.evaluator,
              join(outputDir, 'proof.txt'),
              heading,
              pauseMs,
            ),
        });
      } catch (error) {
        setupError = error;
        log(String((error as Error)?.stack ?? error));
        throw error;
      } finally {
        if (recorder) {
          // Hold the final state so the end of the video is readable.
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
        const page = ide?.page;
        if (page && !page.isClosed()) {
          await attempt('screenshot', () =>
            page.screenshot({
              path: join(outputDir, 'final.png'),
              timeout: 10_000,
            }),
          );
          await attempt('DOM snapshot', async () =>
            writeFileSync(join(outputDir, 'ui.html'), await page.content()),
          );
        }
        if (recorder) {
          const activeRecorder = recorder;
          await attempt('save video', () =>
            activeRecorder.stop(join(outputDir, `${label}.mp4`)),
          );
        }
        if (page && tracing) {
          await attempt('trace', () =>
            page.context().tracing.stop({ path: join(outputDir, 'trace.zip') }),
          );
        }
        if (ide) {
          const connected = ide;
          await attempt('disconnect', () => connected.disconnect());
        }
        if (launched) {
          cleanupErrors.push(...(await launched.stop()));
          const logs = join(launched.session.userDataDir, 'logs');
          await attempt('copy VS Code logs', () => {
            if (existsSync(logs)) {
              cpSync(logs, join(outputDir, 'logs'), { recursive: true });
            }
          });
        }
        if (sandboxDir) {
          const dir = sandboxDir;
          await attempt('remove sandbox', () =>
            rmSync(dir, { recursive: true, force: true }),
          );
        }

        const errors = [
          ...testInfo.errors.map((error) =>
            stripAnsi(error.message ?? String(error.value)),
          ),
          ...(setupError ? [String(setupError)] : []),
        ];
        const status =
          setupError || cleanupErrors.length ? 'failed' : testInfo.status;
        writeFileSync(
          join(outputDir, 'result.json'),
          JSON.stringify(
            {
              ...metadata,
              status,
              errors,
              cleanupErrors,
              finishedAt: new Date().toISOString(),
            },
            null,
            2,
          ),
        );
        writeFileSync(
          join(outputDir, 'result.txt'),
          status === 'passed'
            ? 'PASS\n'
            : `FAIL\n\n${[...errors, ...cleanupErrors].join('\n\n')}\n`,
        );
        for (const [name, contentType] of [
          [`${label}.mp4`, 'video/mp4'],
          ['final.png', 'image/png'],
          ['proof.txt', 'text/plain'],
          ['result.txt', 'text/plain'],
          ['trace.zip', 'application/zip'],
        ]) {
          const path = join(outputDir, name);
          if (existsSync(path)) {
            await testInfo.attach(name, { path, contentType });
          }
        }
        if (cleanupErrors.length && !setupError) {
          throw new Error(cleanupErrors.join('\n'));
        }
      }
    },
    { timeout: 300_000 },
  ],

  nxConsole: async ({ vscode }, use) => {
    await use(vscode.nxConsole);
  },
});

export { expect } from '@playwright/test';
