import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveExtension } from './fixtures/extension';
import { RUNNER_PATH, prepareVSCode, readSession } from './fixtures/ide';
import { isEnabled } from './fixtures/vscode-e2e-runtime';

export default async function globalSetup() {
  const outputDir = process.env.VSCODE_E2E_OUTPUT_DIR!;
  mkdirSync(outputDir, { recursive: true });
  try {
    if (isEnabled(process.env.PLAYWRIGHT_VSCODE_VIDEO)) {
      try {
        execFileSync('ffmpeg', ['-version'], {
          stdio: 'pipe',
          timeout: 10_000,
        });
      } catch {
        throw new Error('Recording VS Code needs ffmpeg on the PATH');
      }
    }

    if (isEnabled(process.env.VSCODE_E2E_ATTACH)) {
      const session = readSession();
      if (!session) {
        throw new Error(
          'No automation IDE is running for this worktree. Start one with yarn nx run vscode-e2e:automation-ide.',
        );
      }
      const { token: _token, ...details } = session;
      writeFileSync(
        join(outputDir, 'setup.json'),
        JSON.stringify({ mode: 'attach', session: details }, null, 2),
      );
      return;
    }

    if (!existsSync(RUNNER_PATH)) {
      throw new Error(
        `Missing ${RUNNER_PATH}. Run scenarios through yarn nx run vscode-e2e:e2e.`,
      );
    }
    const { executable, vscodeVersion } = await prepareVSCode();
    const extension = await resolveExtension();
    // Workers inherit environment variables set during global setup.
    process.env.VSCODE_E2E_BINARY_PATH = executable;
    process.env.VSCODE_E2E_VSCODE_VERSION = vscodeVersion;
    process.env.VSCODE_E2E_EXTENSION_INFO = JSON.stringify(extension);
    writeFileSync(
      join(outputDir, 'setup.json'),
      JSON.stringify(
        {
          mode: 'launch',
          vscodeVersion,
          executable,
          extension,
          nodeVersion: process.version,
          platform: `${process.platform}-${process.arch}`,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    writeFileSync(
      join(outputDir, 'setup-error.txt'),
      String((error as Error)?.stack ?? error),
    );
    throw error;
  }
}
