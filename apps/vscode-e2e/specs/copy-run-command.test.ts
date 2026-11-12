import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '../base-test';

test.use({ vscodeOptions: { fixture: 'run-flags' } });

test('Run copies the constructed command without starting a task', async ({
  vscode,
}, testInfo) => {
  const { nxConsole, page, evaluator, workspacePath } = vscode;
  const marker = join(workspacePath, 'calls.jsonl');
  await nxConsole.openNxConsoleSidebar();
  await nxConsole.waitForNxConsoleReady();
  await evaluator.evaluate((api) => {
    const state = globalThis as any;
    state.copyTasks = [];
    state.copyTaskListener = api.tasks.onDidStartTask(({ execution }) =>
      state.copyTasks.push({
        name: execution.task.name,
        args: (execution.task.execution as any).args,
      }),
    );
  });
  const terminalsBefore = await evaluator.evaluate(
    (api) => api.window.terminals.length,
  );
  const input = page.locator('.quick-input-widget .quick-input-box input');
  const prompt = (placeholder: string) =>
    expect(input).toHaveAttribute('placeholder', placeholder);
  await nxConsole.quickPick.execute('Nx: run');
  await prompt('Project to run');
  await nxConsole.quickPick.selectItem('app');
  await prompt('Target to run');
  await nxConsole.quickPick.selectItem('dump');
  await prompt('Execute command or set flags');
  await nxConsole.quickPick.selectItem('note');
  await prompt('--note=...');
  await input.fill('two words');
  await page.keyboard.press('Enter');
  await prompt('Execute command or set flags');
  await nxConsole.quickPick.selectItem('Custom Options');
  await prompt('Enter any additional command text.');
  await input.fill('--flag=true positional');
  await page.keyboard.press('Enter');
  await prompt('Execute command or set flags');
  const row = page
    .locator('.quick-input-list .monaco-list-row')
    .filter({ hasText: 'Execute:' });
  const expectedLabel =
    'Execute: nx run app:dump --note=two words --flag=true positional';
  await expect(row.locator('.label-name')).toHaveText(expectedLabel);
  await row.hover();
  await page.screenshot({ path: testInfo.outputPath('copy-button.png') });
  await row
    .getByRole('button', { name: 'Copy command to clipboard' })
    .click({ timeout: 10_000 });
  const expected =
    'npx nx run app:dump "--note=two words" --flag=true positional';
  await expect
    .poll(() => evaluator.evaluate(async (api) => api.env.clipboard.readText()))
    .toBe(expected);
  expect(await evaluator.evaluate(() => (globalThis as any).copyTasks)).toEqual(
    [],
  );
  expect(await evaluator.evaluate((api) => api.window.terminals.length)).toBe(
    terminalsBefore,
  );
  expect(existsSync(marker)).toBe(false);
  await prompt('Execute command or set flags');
  await expect(row.locator('.label-name')).toHaveText(expectedLabel);
  await expect(
    page.getByText('Command copied to clipboard', { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('copy-confirmation.png') });
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
  expect(
    (await evaluator.evaluate(() => (globalThis as any).copyTasks))[0].args,
  ).toEqual([
    'nx',
    'run',
    'app:dump',
    '--note=two words',
    '--flag=true',
    'positional',
  ]);
  expect(
    await evaluator.evaluate(() => (globalThis as any).copyTasks),
  ).toHaveLength(1);
  const loaded = await evaluator.evaluate((api) => ({
    version: api.version,
    extensionPath: api.extensions.getExtension('nrwl.angular-console')
      ?.extensionPath,
  }));
  expect(loaded.extensionPath).toBe(vscode.extension.path);
  writeFileSync(
    testInfo.outputPath('observed.json'),
    JSON.stringify(
      { expected, expectedLabel, calls, loaded, extension: vscode.extension },
      null,
      2,
    ),
  );
  await evaluator.evaluate(() =>
    (globalThis as any).copyTaskListener.dispose(),
  );
});
