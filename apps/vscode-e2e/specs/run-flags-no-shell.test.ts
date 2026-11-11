import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '../base-test';

test.use({ vscodeOptions: { fixture: 'run-flags' } });

type Step = { flag: string; value: string } | { custom: string };

test('Run Target passes typed flags as literal arguments', async ({
  vscode,
}, testInfo) => {
  test.setTimeout(420_000);
  const { nxConsole, page, evaluator, workspacePath } = vscode;
  const proof = vscode.proof([
    'Run Target: literal typed flags',
    vscode.build,
    '',
  ]);
  const marker = (name: string) => join(workspacePath, `injected-${name}`);
  const calls = () => {
    const file = join(workspacePath, 'calls.jsonl');
    return existsSync(file)
      ? readFileSync(file, 'utf8').trim().split('\n').filter(Boolean)
      : [];
  };

  const cases: {
    name: string;
    steps: Step[];
    expected: { note?: string; flag?: boolean };
  }[] = [
    {
      name: 'semicolon',
      steps: [{ flag: 'note', value: `a b; touch ${marker('semicolon')}; #` }],
      expected: { note: `a b; touch ${marker('semicolon')}; #` },
    },
    {
      name: 'substitution',
      steps: [
        {
          flag: 'note',
          value: `$(touch ${marker('substitution')}) \`touch ${marker('backtick')}\``,
        },
      ],
      expected: {
        note: `$(touch ${marker('substitution')}) \`touch ${marker('backtick')}\``,
      },
    },
    {
      name: 'spaces',
      steps: [{ flag: 'note', value: 'two  words & more' }],
      expected: { note: 'two  words & more' },
    },
    {
      name: 'custom-ordinary',
      steps: [{ custom: '--note="quoted words" --flag' }],
      expected: { note: 'quoted words', flag: true },
    },
    {
      name: 'custom-semicolon',
      steps: [{ custom: `--flag; touch ${marker('custom')}` }],
      expected: {},
    },
  ];

  await nxConsole.openNxConsoleSidebar();
  await nxConsole.waitForNxConsoleReady();

  for (const entry of cases) {
    await nxConsole.resetUI();
    await evaluator.evaluate((api) => {
      const state = globalThis as any;
      state.runTasks = [];
      state.runEnds = [];
      state.runListeners = [
        api.tasks.onDidStartTask(({ execution }) => {
          const task = execution.task;
          const config = task.execution as any;
          state.runTasks.push({
            name: task.name,
            kind: config.process ? 'process' : 'shell',
            process: config.process,
            args: config.args,
            commandLine: config.commandLine,
          });
        }),
        api.tasks.onDidEndTaskProcess(({ exitCode }) =>
          state.runEnds.push(exitCode),
        ),
      ];
    });
    const before = calls().length;
    const input = page.locator('.quick-input-widget .quick-input-box input');
    const prompt = (placeholder: string) =>
      expect(input).toHaveAttribute('placeholder', placeholder, {
        timeout: 30_000,
      });
    await nxConsole.quickPick.execute('Nx: Run Target');
    await prompt('Target to run');
    await nxConsole.quickPick.selectItem('dump');
    await prompt('Project to run');
    await nxConsole.quickPick.selectItem('app');
    for (const step of entry.steps) {
      await prompt('Execute command or set flags');
      if ('flag' in step) {
        await nxConsole.quickPick.selectItem(step.flag);
        await prompt(`--${step.flag}=...`);
        await input.fill(step.value);
      } else {
        await nxConsole.quickPick.selectItem('Custom Options');
        await prompt('Enter any additional command text.');
        await input.fill(step.custom);
      }
      await page.keyboard.press('Enter');
    }
    await prompt('Execute command or set flags');
    await page.screenshot({
      path: testInfo.outputPath(`${entry.name}-before-execute.png`),
    });
    await nxConsole.quickPick.selectItem('Execute:');
    await expect
      .poll(
        () => evaluator.evaluate(() => (globalThis as any).runEnds.length),
        { timeout: 120_000 },
      )
      .toBeGreaterThan(0);
    const tasks = await evaluator.evaluate(() => (globalThis as any).runTasks);
    const ends = await evaluator.evaluate(() => (globalThis as any).runEnds);
    const recorded = calls().slice(before);
    const received = recorded.length
      ? JSON.parse(recorded[recorded.length - 1]).options
      : undefined;
    const injected = ['semicolon', 'substitution', 'backtick', 'custom'].filter(
      (name) => existsSync(marker(name)),
    );
    injected.forEach((name) => rmSync(marker(name)));
    writeFileSync(
      testInfo.outputPath(`${entry.name}-result.json`),
      JSON.stringify(
        { steps: entry.steps, tasks, ends, received, injected },
        null,
        2,
      ),
    );
    await proof.show(`${entry.name}: typed ${JSON.stringify(entry.steps)}`);
    await proof.show(
      `Task: ${JSON.stringify(tasks)}; exit=${JSON.stringify(ends)}`,
    );
    await proof.show(
      `Executor received note=${JSON.stringify(received?.note)} flag=${JSON.stringify(received?.flag)}; markers=${JSON.stringify(injected)}`,
    );
    expect.soft(injected, `${entry.name}: no second command runs`).toEqual([]);
    expect
      .soft(received?.note, `${entry.name}: note`)
      .toEqual(entry.expected.note);
    expect
      .soft(received?.flag, `${entry.name}: flag`)
      .toEqual(entry.expected.flag);
    await evaluator.evaluate(() => {
      for (const listener of (globalThis as any).runListeners)
        listener.dispose();
    });
  }
  await proof.show(testInfo.errors.length ? 'RESULT: FAIL' : 'RESULT: PASS');
});

test('Run passes project names as literal arguments', async ({
  vscode,
}, testInfo) => {
  test.setTimeout(300_000);
  const { nxConsole, evaluator, workspacePath } = vscode;
  const proof = vscode.proof([
    'Run: project names as arguments',
    vscode.build,
    '',
  ]);
  const projectName = 'pwn;touch${IFS}injected-name;echo';
  const marker = join(workspacePath, 'injected-name');
  await nxConsole.openNxConsoleSidebar();
  await nxConsole.waitForNxConsoleReady();
  await evaluator.evaluate((api) => {
    const state = globalThis as any;
    state.runTasks = [];
    state.runEnds = [];
    state.runListeners = [
      api.tasks.onDidStartTask(({ execution }) => {
        const config = execution.task.execution as any;
        state.runTasks.push({
          name: execution.task.name,
          kind: config.process ? 'process' : 'shell',
          process: config.process,
          args: config.args,
          commandLine: config.commandLine,
        });
      }),
      api.tasks.onDidEndTaskProcess(({ exitCode }) =>
        state.runEnds.push(exitCode),
      ),
    ];
  });
  // The command behind the project tree, Nx Commands and CodeLens run actions.
  await evaluator.evaluate(
    (api, name: string) =>
      void api.commands.executeCommand(
        'nx.run',
        name,
        'dump',
        undefined,
        false,
      ),
    projectName,
  );
  await expect
    .poll(() => evaluator.evaluate(() => (globalThis as any).runEnds.length), {
      timeout: 120_000,
    })
    .toBeGreaterThan(0);
  const tasks = await evaluator.evaluate(() => (globalThis as any).runTasks);
  const ends = await evaluator.evaluate(() => (globalThis as any).runEnds);
  writeFileSync(
    testInfo.outputPath('workspace-name-result.json'),
    JSON.stringify({ projectName, tasks, ends }, null, 2),
  );
  await proof.show(`Project name: ${JSON.stringify(projectName)}`);
  await proof.show(
    `Task: ${JSON.stringify(tasks)}; exit=${JSON.stringify(ends)}`,
  );
  await proof.show(`Marker exists=${existsSync(marker)}`);
  expect.soft(existsSync(marker), 'no second command runs').toBe(false);
  expect
    .soft(tasks[0]?.args, 'the project reaches Nx as one literal argument')
    .toEqual(['nx', 'run', `${projectName}:dump`]);
  await proof.show(testInfo.errors.length ? 'RESULT: FAIL' : 'RESULT: PASS');
});
