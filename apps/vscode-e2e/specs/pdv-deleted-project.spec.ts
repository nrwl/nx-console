import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '../base-test';

test.use({
  vscodeOptions: {
    fixture: 'project-details',
    workspacePath: process.env.VSCODE_PDV_WORKSPACE,
  },
});

test('Project Details replaces deleted projects and clears repaired errors', async ({
  vscode,
}, testInfo) => {
  test.setTimeout(240_000);
  const { page, evaluator, nxConsole, workspacePath } = vscode;
  const projectDir = join(workspacePath, 'apps/hello');
  const projectFile = join(projectDir, 'project.json');
  const nxFile = join(workspacePath, 'nx.json');
  const savedProject = testInfo.outputPath('saved-project');
  cpSync(projectDir, savedProject, { recursive: true });
  const originalNx = readFileSync(nxFile, 'utf8');
  const proof = vscode.proof([
    'Deleted Project Details regression',
    vscode.build,
    '',
  ]);
  const show = async (line: string) => {
    await evaluator.evaluate(async (api) => {
      await api.commands.executeCommand(
        'workbench.action.focusFirstEditorGroup',
      );
    });
    await proof.show(line);
  };
  const text = async () => {
    const bodies: string[] = [];
    for (const frame of page.frames()) {
      if (frame === page.mainFrame()) continue;
      try {
        bodies.push(await frame.locator('body').innerText({ timeout: 1000 }));
      } catch {
        /* Webview frames can be replaced during refresh. */
      }
    }
    return bodies.join('\n');
  };
  const snapshot = async (name: string) => {
    writeFileSync(testInfo.outputPath(`${name}.txt`), await text());
    await page.screenshot({ path: testInfo.outputPath(`${name}.png`) });
  };
  const restore = () => {
    cpSync(savedProject, projectDir, { recursive: true });
  };
  const deleteAndCheck = async (name: string) => {
    rmSync(projectDir, { recursive: true });
    await expect
      .poll(() => nxConsole.getProjectsTreeItems().allTextContents())
      .toEqual(['util']);
    await expect.soft
      .poll(text, {
        message: 'The open details view must explain the missing project',
        timeout: 15_000,
      })
      .toContain(`No project found at ${projectFile}`);
    const rendered = await text();
    expect
      .soft(rendered, 'Deleted targets must be replaced')
      .not.toContain('Root: apps/hello');
    expect
      .soft(rendered, 'A repaired nx.json error must not reappear')
      .not.toContain('Unable to read nx.json');
    await show(
      `${name}: missing message=${rendered.includes('No project found')}; stale targets=${rendered.includes('Root: apps/hello')}; stale nx.json error=${rendered.includes('Unable to read nx.json')}`,
    );
    await snapshot(name);
    restore();
    await expect
      .poll(() => nxConsole.getProjectsTreeItems().allTextContents())
      .toEqual(['hello', 'util']);
    await expect.poll(text).toContain('Root: apps/hello');
    await show('Restored project: details returned in the same view.');
    await snapshot(`${name}-restored`);
  };
  try {
    await nxConsole.openNxConsoleSidebar();
    await nxConsole.waitForNxConsoleReady();
    await evaluator.evaluate(async (api, file) => {
      await api.window.showTextDocument(
        await api.workspace.openTextDocument(api.Uri.file(file)),
        { viewColumn: api.ViewColumn.One },
      );
      await api.commands.executeCommand(
        'nx.project-details.openToSide',
        api.Uri.file(file),
      );
    }, projectFile);
    await expect.poll(text).toContain('Root: apps/hello');
    await show('hello targets are visible. Delete the project configuration.');
    await snapshot('01-before');
    await deleteAndCheck('02-fresh-delete');
    writeFileSync(nxFile, '{ "broken": [ }\n');
    await evaluator.evaluate(async (api) => {
      void api.commands.executeCommand('nxConsole.refreshWorkspace');
    });
    await expect
      .poll(text, { timeout: 60_000 })
      .toContain('Unable to read nx.json');
    await show('The configuration error is visible. Repair nx.json.');
    await snapshot('03-config-error');
    writeFileSync(nxFile, originalNx);
    await expect.poll(text, { timeout: 60_000 }).toContain('Root: apps/hello');
    await expect.poll(text).not.toContain('Unable to read nx.json');
    await show('Configuration repaired; targets returned. Delete hello again.');
    await snapshot('04-config-repaired');
    await deleteAndCheck('05-delete-after-repair');
  } finally {
    restore();
    writeFileSync(nxFile, originalNx);
  }
});
