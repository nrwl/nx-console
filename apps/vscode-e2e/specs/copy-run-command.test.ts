import type { Locator, Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type VSCodeSession } from '../base-test';

test.use({ vscodeOptions: { fixture: 'run-flags' } });

const EXPECTED_LABEL =
  'Execute: nx run app:dump --note=two words --flag=true positional';
const EXPECTED_COMMAND =
  'npx nx run app:dump "--note=two words" --flag=true positional';
const PLACEHOLDER = 'Execute command or set flags';

async function recordStartedTasks({ evaluator }: VSCodeSession) {
  await evaluator.evaluate((api) => {
    const state = globalThis as any;
    state.copyTasks = [];
    state.copyTaskListener?.dispose();
    state.copyTaskListener = api.tasks.onDidStartTask(({ execution }) =>
      state.copyTasks.push({
        name: execution.task.name,
        args: (execution.task.execution as any).args,
      }),
    );
  });
  return {
    started: (): Promise<{ name: string; args: unknown[] }[]> =>
      evaluator.evaluate(() => (globalThis as any).copyTasks),
    terminals: (): Promise<number> =>
      evaluator.evaluate((api) => api.window.terminals.length),
  };
}

async function openExecutePrompt({ page, nxConsole }: VSCodeSession) {
  const input = page.locator('.quick-input-widget .quick-input-box input');
  const prompt = (placeholder: string) =>
    expect(input).toHaveAttribute('placeholder', placeholder);
  await nxConsole.quickPick.execute('Nx: run');
  await prompt('Project to run');
  await nxConsole.quickPick.selectItem('app');
  await prompt('Target to run');
  await nxConsole.quickPick.selectItem('dump');
  await prompt(PLACEHOLDER);
  await nxConsole.quickPick.selectItem('note');
  await prompt('--note=...');
  await input.fill('two words');
  await page.keyboard.press('Enter');
  await prompt(PLACEHOLDER);
  await nxConsole.quickPick.selectItem('Custom Options');
  await prompt('Enter any additional command text.');
  await input.fill('--flag=true positional');
  await page.keyboard.press('Enter');
  await prompt(PLACEHOLDER);
  const row = page
    .locator('.quick-input-list .monaco-list-row')
    .filter({ hasText: 'Execute:' });
  await expect(row.locator('.label-name')).toHaveText(EXPECTED_LABEL);
  return { input, row };
}

// The screencast has no mouse cursor, so outline the element being clicked.
async function highlight(page: Page, target: Locator) {
  const box = await target.boundingBox();
  if (!box) return;
  await page.evaluate((b) => {
    const ring = document.createElement('div');
    ring.style.cssText = `position:fixed;z-index:100000;pointer-events:none;left:${b.x - 4}px;top:${b.y - 4}px;width:${b.width + 8}px;height:${b.height + 8}px;border:3px solid #ff3b30;border-radius:6px;`;
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 2000);
  }, box);
}

test('the copy button copies the command without running it', async ({
  vscode,
}) => {
  const { page, nxConsole, evaluator, workspacePath } = vscode;
  const marker = join(workspacePath, 'calls.jsonl');
  const proof = vscode.proof([
    'Copy button on the "Execute: nx ..." row of Nx: run',
    vscode.build,
    '',
  ]);
  await nxConsole.openNxConsoleSidebar();
  await nxConsole.waitForNxConsoleReady();
  const tasks = await recordStartedTasks(vscode);
  const terminalsBefore = await tasks.terminals();
  await evaluator.evaluate(async (api) => {
    await api.env.clipboard.writeText('<clipboard cleared by the test>');
  });
  await proof.show(
    `clipboard before: ${await evaluator.evaluate(async (api) => api.env.clipboard.readText())}`,
  );

  const { input, row } = await openExecutePrompt(vscode);
  await row.hover();
  const copyButton = row.getByRole('button', {
    name: 'Copy command to clipboard',
  });
  await expect(copyButton).toBeVisible();
  await highlight(page, copyButton);
  await page.waitForTimeout(1000);
  await copyButton.click();

  await expect(
    page.getByText('Command copied to clipboard', { exact: true }),
  ).toBeVisible();
  // Give an accidentally accepted pick time to start its task.
  await page.waitForTimeout(3000);
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute('placeholder', PLACEHOLDER);
  await expect(row.locator('.label-name')).toHaveText(EXPECTED_LABEL);
  expect(await tasks.started()).toEqual([]);

  await page.keyboard.press('Escape');
  await expect(input).toBeHidden();

  const clipboard = await evaluator.evaluate(async (api) =>
    api.env.clipboard.readText(),
  );
  await proof.show(`clicked the copy button; quick pick stayed open`);
  await proof.show('clipboard after:');
  await proof.show(`  ${clipboard}`);
  expect(clipboard).toBe(EXPECTED_COMMAND);

  await evaluator.evaluate(async (api) => {
    const document = await api.workspace.openTextDocument({ content: '' });
    await api.window.showTextDocument(document, api.ViewColumn.Beside);
  });
  await page
    .locator('.editor-group-container.active .monaco-editor .view-lines')
    .click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V',
  );
  const pasted = () =>
    evaluator.evaluate(
      (api) => api.window.activeTextEditor?.document.getText() ?? '',
    );
  await expect.poll(pasted).toBe(EXPECTED_COMMAND);
  const pastedText = await pasted();
  await page.keyboard.press('Home');
  await page.waitForTimeout(1500);

  await nxConsole.executeCommand('workbench.action.focusFirstEditorGroup');
  const started = await tasks.started();
  const terminals = await tasks.terminals();
  await proof.show('pasted into the editor on the right:');
  await proof.show(`  ${pastedText}`);
  await proof.show(
    `tasks started: ${started.length ? JSON.stringify(started) : 'none'}`,
  );
  await proof.show(`terminals opened: ${terminals - terminalsBefore}`);
  await proof.show(`target ran (calls.jsonl exists): ${existsSync(marker)}`);
  expect(started).toEqual([]);
  expect(terminals).toBe(terminalsBefore);
  expect(existsSync(marker)).toBe(false);
});

test('Execute still runs the task after copying', async ({ vscode }) => {
  const { page, nxConsole, workspacePath } = vscode;
  const marker = join(workspacePath, 'calls.jsonl');
  await nxConsole.openNxConsoleSidebar();
  await nxConsole.waitForNxConsoleReady();
  const tasks = await recordStartedTasks(vscode);

  const { row } = await openExecutePrompt(vscode);
  await row.hover();
  await row.getByRole('button', { name: 'Copy command to clipboard' }).click();
  await expect(
    page.getByText('Command copied to clipboard', { exact: true }),
  ).toBeVisible();
  expect(await tasks.started()).toEqual([]);

  await nxConsole.quickPick.selectItem('Execute:');
  await expect.poll(() => existsSync(marker), { timeout: 120_000 }).toBe(true);
  const calls = readFileSync(marker, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  expect(calls).toHaveLength(1);
  expect(calls[0].options).toMatchObject({
    note: 'two words',
    flag: true,
    positional: 'positional',
  });
  const started = await tasks.started();
  expect(started).toHaveLength(1);
  expect(started[0].args).toEqual([
    'nx',
    'run',
    'app:dump',
    '--note=two words',
    '--flag=true',
    'positional',
  ]);
});
