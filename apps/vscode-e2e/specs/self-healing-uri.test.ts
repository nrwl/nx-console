import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { VSCodeEvaluator } from '../fixtures/vscode-evaluator';
import { selfHealingCloudId } from '../fixtures/workspaces';
import { expect, test } from '../base-test';

test.use({ vscodeOptions: { fixture: 'self-healing' } });

const MARKER_FILE = 'self-healing-injection-marker';

function selfHealingLink(fixId: string): string {
  return `vscode://nrwl.angular-console/self-healing/${selfHealingCloudId}/${encodeURIComponent(fixId)}`;
}

/** Opens the link like a browser would, and returns the shell tasks it started within `waitMs`. */
async function openLinkAndCollectTasks(
  evaluator: VSCodeEvaluator,
  link: string,
  waitMs: number,
) {
  return evaluator.evaluate(
    async (vscode, uri: string, ms: number) => {
      for (const terminal of vscode.window.terminals) terminal.dispose();
      const started: { name: string; command: unknown; args: unknown }[] = [];
      const listener = vscode.tasks.onDidStartTask(({ execution }) => {
        const shell = execution.task.execution as InstanceType<
          typeof vscode.ShellExecution
        >;
        started.push({
          name: execution.task.name,
          command: shell?.command,
          args: shell?.args,
        });
      });
      await vscode.env.openExternal(vscode.Uri.parse(uri));
      await new Promise((resolve) => setTimeout(resolve, ms));
      listener.dispose();
      for (const execution of vscode.tasks.taskExecutions)
        execution.terminate();
      return started;
    },
    link,
    waitMs,
  );
}

test.beforeEach(async ({ vscode }) => {
  rmSync(join(vscode.workspacePath, MARKER_FILE), { force: true });
  await vscode.nxConsole.resetUI();
});

test('a self-healing link cannot run shell commands through its fix id', async ({
  vscode,
}) => {
  const proof = vscode.proof([
    'Self-healing link with shell syntax in the fix id',
    vscode.build,
    '',
  ]);
  const fixId = `abc12-def34$(touch ${MARKER_FILE})`;
  const marker = join(vscode.workspacePath, MARKER_FILE);
  await proof.show(`link: ${selfHealingLink(fixId)}`);

  const started = await openLinkAndCollectTasks(
    vscode.evaluator,
    selfHealingLink(fixId),
    10_000,
  );
  const invalidLinkError = vscode.page
    .locator('.notifications-toasts')
    .getByText('Invalid self-healing URI format');
  const errorShown = await invalidLinkError.isVisible();

  await proof.show(
    `tasks started: ${started.length ? started.map((t) => t.name).join(', ') : 'none'}`,
  );
  await proof.show(`marker file created by the shell: ${existsSync(marker)}`);
  await proof.show(`"Invalid self-healing URI format" shown: ${errorShown}`);
  expect.soft(existsSync(marker)).toBe(false);
  expect.soft(started).toEqual([]);
  expect.soft(errorShown).toBe(true);
});

test('a valid self-healing link passes the fix id to nx-cloud as a quoted argument', async ({
  vscode,
}) => {
  const proof = vscode.proof([
    'Self-healing link with a valid fix id',
    vscode.build,
    '',
  ]);
  const fixId = 'abc12-def34';
  await proof.show(`link: ${selfHealingLink(fixId)}`);

  const started = await openLinkAndCollectTasks(
    vscode.evaluator,
    selfHealingLink(fixId),
    5_000,
  );

  await proof.show(`tasks started: ${JSON.stringify(started)}`);
  expect.soft(started).toEqual([
    {
      name: `nx-cloud apply-locally ${fixId}`,
      command: 'npx',
      // ShellQuoting.Strong
      args: ['nx-cloud', 'apply-locally', { value: fixId, quoting: 2 }],
    },
  ]);
});
