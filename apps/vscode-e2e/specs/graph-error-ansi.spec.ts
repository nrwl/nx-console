import { test, expect } from '@playwright/test';
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { connectIde, createSandboxDir, launchIde } from '../fixtures/ide';
import { workspaceRoot } from 'nx/src/devkit-exports';
import { ScreencastRecorder } from '../fixtures/screencast';

test('graph errors render readable text in Project Details and diagnostics', async ({}, testInfo) => {
  const output = testInfo.outputPath();
  mkdirSync(output, { recursive: true });
  const sandbox = createSandboxDir();
  const workspace = process.env.NX_ANSI_FIXTURE ?? join(sandbox, 'workspace');
  if (!process.env.NX_ANSI_FIXTURE) {
    const json = (file: string, value: unknown) =>
      writeFileSync(join(workspace, file), JSON.stringify(value));
    mkdirSync(join(workspace, 'apps/hello'), { recursive: true });
    mkdirSync(join(workspace, 'libs/util'), { recursive: true });
    json('nx.json', { analytics: false, neverConnectToCloud: true });
    json('package.json', {
      name: 'graph-error-ansi-fixture',
      private: true,
      devDependencies: { nx: require('nx/package.json').version },
    });
    json('package-lock.json', {
      lockfileVersion: 3,
      packages: {
        '': { devDependencies: { nx: require('nx/package.json').version } },
      },
    });
    json('apps/hello/project.json', {
      name: 'hello',
      targets: {
        hello: {
          executor: 'nx:run-commands',
          options: { command: 'echo hello' },
        },
      },
    });
    json('libs/util/project.json', { name: 'util' });
    symlinkSync(
      join(workspaceRoot, 'node_modules'),
      join(workspace, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
  }
  const projectFile = join(workspace, 'apps/hello/project.json');
  const original = readFileSync(projectFile, 'utf8');
  let launched: Awaited<ReturnType<typeof launchIde>> | undefined;
  let ide: Awaited<ReturnType<typeof connectIde>> | undefined;
  let recorder: ScreencastRecorder | undefined;
  try {
    delete process.env.FORCE_COLOR;
    delete process.env.NO_COLOR;
    launched = await launchIde({
      sandboxDir: sandbox,
      workspacePath: workspace,
      executable: process.env.VSCODE_E2E_BINARY_PATH!,
      vscodeVersion: process.env.VSCODE_E2E_VSCODE_VERSION!,
      extension: JSON.parse(process.env.VSCODE_E2E_EXTENSION_INFO!),
      log: (text) => appendFileSync(join(output, 'ide.log'), text + '\n'),
    });
    writeFileSync(
      join(output, 'build.json'),
      JSON.stringify(
        {
          extension: launched.session.extension,
          revision: execFileSync('git', ['rev-parse', 'HEAD'], {
            encoding: 'utf8',
          }).trim(),
          diff: execFileSync('git', ['diff', 'HEAD'], { encoding: 'utf8' }),
          startedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    ide = await connectIde(launched.session);
    const { page, evaluator, nxConsole } = ide;
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.context().tracing.start({ screenshots: true, snapshots: true });
    recorder = await ScreencastRecorder.start(page, join(output, 'frames'));
    await nxConsole.openNxConsoleSidebar();
    await nxConsole.waitForNxConsoleReady(90_000);
    await evaluator.evaluate(async (vscode, file) => {
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.file(file),
      );
      await vscode.window.showTextDocument(doc, { preview: false });
      await vscode.commands.executeCommand(
        'nx.project-details.openToSide',
        vscode.Uri.file(file),
      );
    }, projectFile);
    const detailsText = async () => {
      for (const frame of page.frames()) {
        if (frame === page.mainFrame()) continue;
        try {
          const text = await frame.locator('body').innerText({ timeout: 1000 });
          if (text.includes('apps/hello') || text.includes('No project found'))
            return text;
        } catch {
          /* Webview frames can be replaced during rendering. */
        }
      }
      return '';
    };
    await expect
      .poll(detailsText, { timeout: 60_000 })
      .toContain('Root: apps/hello');
    await page.screenshot({ path: join(output, '01-ready.png') });
    await evaluator.evaluate(async (vscode, file) => {
      const uri = vscode.Uri.file(file);
      const doc = await vscode.workspace.openTextDocument(uri);
      const edit = new vscode.WorkspaceEdit();
      edit.replace(
        uri,
        new vscode.Range(
          doc.positionAt(0),
          doc.positionAt(doc.getText().length),
        ),
        '{ "broken": [ }\n',
      );
      await vscode.workspace.applyEdit(edit);
      await doc.save();
      void vscode.commands.executeCommand('nxConsole.refreshWorkspace');
    }, projectFile);
    await expect
      .poll(detailsText, { timeout: 60_000 })
      .toContain('ValueExpected');
    const diagnostics = () =>
      evaluator.evaluate(async (vscode) =>
        vscode.languages.getDiagnostics().flatMap(([uri, items]) =>
          items.map((item) => ({
            file: uri.fsPath,
            source: item.source,
            message: item.message,
          })),
        ),
      );
    await expect
      .poll(async () => JSON.stringify(await diagnostics()), {
        timeout: 30_000,
      })
      .toContain('ValueExpected');
    const text = await detailsText();
    const graphDiagnostics = (await diagnostics()).filter((item) =>
      item.message.includes('ValueExpected'),
    );
    writeFileSync(join(output, 'rendered-error.txt'), text);
    writeFileSync(
      join(output, 'diagnostics.json'),
      JSON.stringify(graphDiagnostics, null, 2),
    );
    await page.screenshot({ path: join(output, '02-error.png') });
    expect.soft(text).toContain('{ "broken": [ }');
    expect
      .soft(text, 'Project Details must remove ANSI escape sequences')
      .not.toMatch(/[\u001b\u009b]/);
    expect.soft(graphDiagnostics.length).toBeGreaterThan(0);
    for (const diagnostic of graphDiagnostics) {
      expect
        .soft(
          diagnostic.message,
          'Graph diagnostics must remove ANSI escape sequences',
        )
        .not.toMatch(/[\u001b\u009b]/);
    }
  } finally {
    if (ide) {
      await ide.page
        .screenshot({ path: join(output, 'final.png') })
        .catch(() => {});
      await ide.page
        .context()
        .tracing.stop({ path: join(output, 'trace.zip') })
        .catch(() => {});
    }
    if (recorder)
      await recorder.stop(
        join(output, `${process.env.NX_AUTOMATION_LABEL}.mp4`),
      );
    writeFileSync(projectFile, original);
    if (ide) await ide.disconnect();
    if (launched) {
      const errors = await launched.stop();
      writeFileSync(join(output, 'cleanup.json'), JSON.stringify(errors));
      const logs = join(launched.session.userDataDir, 'logs');
      if (existsSync(logs))
        cpSync(logs, join(output, 'logs'), { recursive: true });
    }
    rmSync(sandbox, { recursive: true, force: true });
  }
});
