import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '../base-test';

test.use({ vscodeOptions: { fixture: 'generator-no-shell' } });

test('Generate UI passes literal options without a shell', async ({
  vscode,
}, testInfo) => {
  test.setTimeout(300_000);
  const { nxConsole, page, evaluator, workspacePath } = vscode;
  const proof = vscode.proof([
    'Generate UI: literal process arguments',
    vscode.build,
    '',
  ]);
  const marker = join(workspacePath, 'injected-two-fields');
  const marker2 = join(workspacePath, 'injected-single-field');
  const cases = [
    { name: 'two-fields', importPath: 'a \\', tags: `; touch ${marker}; #` },
    {
      name: 'single-field',
      importPath: '’unicode”',
      tags: `a';touch ${marker2};'`,
    },
    {
      name: 'normal',
      importPath: 'a value with spaces & more',
      tags: 'scope:shared,type:ui',
    },
  ];
  await nxConsole.openNxConsoleSidebar();
  await nxConsole.waitForNxConsoleReady();
  for (const entry of cases) {
    await nxConsole.resetUI();
    await nxConsole.quickPick.execute('Nx: Generate (UI)');
    await nxConsole.quickPick.selectItem('@nx/js - library');
    await expect.poll(() => nxConsole.getGenerateUiTitle()).toBeTruthy();
    const form = page
      .frames()
      .find((frame) => frame.url().includes('vscode-webview'));
    expect(form, 'Generate UI webview frame').toBeTruthy();
    // The webview renderer may have a second iframe inside its host frame.
    let fields = form!;
    for (const frame of page.frames()) {
      if (await frame.locator('[data-cy="title"]').count()) fields = frame;
    }
    const fill = async (name: string, value: string) => {
      const field = fields.locator(`[id="${name}-field"]`);
      if (!(await field.isVisible()))
        await fields.locator('[data-cy="show-more"]').click();
      await field.locator('input').fill(value);
    };
    await fill('directory', entry.name);
    await fill('name', entry.name);
    await fill('importPath', entry.importPath);
    await fill('tags', entry.tags);
    await page.screenshot({
      path: testInfo.outputPath(`${entry.name}-action.png`),
    });
    await evaluator.evaluate((api) => {
      const state = globalThis as any;
      state.generatorTasks = [];
      state.generatorEnds = [];
      state.generatorListeners = [
        api.tasks.onDidStartTask(({ execution }) => {
          const task = execution.task;
          const executionConfig = task.execution as any;
          state.generatorTasks.push({
            name: task.name,
            process: executionConfig.process,
            commandLine: executionConfig.commandLine,
            args: executionConfig.args,
            options: executionConfig.options,
          });
        }),
        api.tasks.onDidEndTaskProcess(({ exitCode }) =>
          state.generatorEnds.push(exitCode),
        ),
      ];
    });
    await fields.locator('[data-cy="generate-button"]').click();
    await expect
      .poll(
        () =>
          evaluator.evaluate(() => (globalThis as any).generatorEnds.length),
        { timeout: 90_000 },
      )
      .toBeGreaterThan(0);
    const tasks = await evaluator.evaluate(
      () => (globalThis as any).generatorTasks,
    );
    const ends = await evaluator.evaluate(
      () => (globalThis as any).generatorEnds,
    );
    writeFileSync(
      testInfo.outputPath(`${entry.name}-tasks.json`),
      JSON.stringify({ tasks, ends }, null, 2),
    );
    const file = join(workspacePath, entry.name, 'project.json');
    const project = existsSync(file)
      ? JSON.parse(readFileSync(file, 'utf8'))
      : undefined;
    if (project)
      writeFileSync(
        testInfo.outputPath(`${entry.name}-project.json`),
        JSON.stringify(project, null, 2),
      );
    const paths = JSON.parse(
      readFileSync(join(workspacePath, 'tsconfig.base.json'), 'utf8'),
    ).compilerOptions.paths;
    const injected = [marker, marker2].filter(existsSync);
    await proof.show(
      `${entry.name}: typed importPath=${JSON.stringify(entry.importPath)}, tags=${JSON.stringify(entry.tags)}`,
    );
    await proof.show(
      `Task: ${JSON.stringify(tasks)}; exit codes=${JSON.stringify(ends)}`,
    );
    await proof.show(
      `Actual tags=${JSON.stringify(project?.tags)}; import path preserved=${Boolean(paths[entry.importPath])}; markers=${JSON.stringify(injected)}`,
    );
    expect.soft(injected, 'no shell payload creates a marker file').toEqual([]);
    expect.soft(ends, 'generator exits successfully').toEqual([0]);
    expect
      .soft(project?.tags, 'literal tags reach the generator')
      .toEqual(entry.tags.split(',').map((tag) => tag.trim()));
    expect
      .soft(paths[entry.importPath], 'literal importPath reaches the generator')
      .toEqual([`./${entry.name}/src/index.ts`]);
    expect
      .soft(tasks[0]?.process, 'Generate UI uses ProcessExecution')
      .toBeTruthy();
    await evaluator.evaluate(() => {
      for (const listener of (globalThis as any).generatorListeners)
        listener.dispose();
    });
  }
  await proof.show(testInfo.errors.length ? 'RESULT: FAIL' : 'RESULT: PASS');
});
