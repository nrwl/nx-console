import { appendFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '../base-test';

test('Affected offers supported flags and runs the selected target', async ({
  vscode,
}, testInfo) => {
  const { evaluator, nxConsole, page, workspacePath } = vscode;
  const marker = join(workspacePath, 'demo', 'affected-ran');
  await nxConsole.openNxConsoleSidebar();
  await nxConsole.waitForNxConsoleReady();
  appendFileSync(
    join(workspacePath, 'demo', 'hello.cjs'),
    '\nrequire("node:fs").writeFileSync("demo/affected-ran", "");\n',
  );

  const picker = page.locator('.quick-input-widget:visible');
  const input = picker.locator('.quick-input-box input');
  const rows = picker.locator('.monaco-list-row');
  const openFlags = async () => {
    await nxConsole.quickPick.execute('Nx: affected');
    await nxConsole.quickPick.selectItem('check');
    await expect(input).toHaveAttribute(
      'placeholder',
      'Execute command or set flags',
    );
    await expect(rows.getByText('files', { exact: true })).toBeVisible();
  };

  await openFlags();
  await page.screenshot({ path: testInfo.outputPath('affected-flags.png') });
  await expect(rows.getByText('all', { exact: true })).toHaveCount(0);

  await nxConsole.quickPick.selectItem('files');
  await expect(input).toHaveAttribute('placeholder', '--files=...');
  await input.fill('demo/hello.cjs');
  await page.keyboard.press('Enter');
  await expect(
    rows.filter({
      hasText: /Execute: nx affected --target=check --files=demo\/hello\.cjs/,
    }),
  ).toBeVisible();
  await evaluator.evaluate((api) => {
    const state = globalThis as typeof globalThis & {
      affectedExitCode?: number;
    };
    const listener = api.tasks.onDidEndTaskProcess(({ exitCode }) => {
      state.affectedExitCode = exitCode;
      listener.dispose();
    });
  });
  await nxConsole.quickPick.selectItem('Execute:');
  await expect
    .poll(() =>
      evaluator.evaluate(
        () =>
          (globalThis as typeof globalThis & { affectedExitCode?: number })
            .affectedExitCode,
      ),
    )
    .toBe(0);
  expect(existsSync(marker)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('affected-success.png') });

  await openFlags();
});
