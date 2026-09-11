import { expect, test } from '../base-test';
import { nestedProjectParents, runNx } from '../fixtures/workspaces';

test.use({ vscodeOptions: { fixture: 'nested-projects' } });

// https://github.com/nrwl/nx-console/issues/3193
test('nested projects are reachable in the Projects tree', async ({
  vscode,
}, testInfo) => {
  const { nxConsole, workspacePath } = vscode;
  const proof = vscode.proof([
    'Nested projects in the Projects tree (#3193)',
    vscode.build,
    'nxConsole.projectViewingStyle: automatic, 15 projects → folder tree',
    '',
  ]);

  const graph: string[] = JSON.parse(
    runNx(workspacePath, ['show', 'projects', '--json']),
  );
  const nested = nestedProjectParents.flatMap((parent) => [
    parent.name,
    ...parent.children.map((child) => child.name),
  ]);
  await proof.show(
    `nx show projects: ${nested.filter((name) => graph.includes(name)).length}/${nested.length} nested projects in the graph`,
  );
  expect(graph).toEqual(expect.arrayContaining(nested));

  await nxConsole.openNxConsoleSidebar();
  await nxConsole.waitForNxConsoleReady();
  await nxConsole.expandTreeRow('e2es');

  for (const parent of nestedProjectParents) {
    await test.step(parent.name, async () => {
      await expect(nxConsole.getTreeRow(parent.name)).toBeVisible();
      const expandable = await nxConsole.isTreeRowExpandable(parent.name);
      if (expandable) {
        await nxConsole.expandTreeRow(parent.name);
      }
      const shown: string[] = [];
      for (const child of parent.children) {
        const visible = await nxConsole
          .getTreeRow(child.name)
          .waitFor({ timeout: 5_000 })
          .then(
            () => true,
            () => false,
          );
        if (visible) shown.push(child.name);
      }
      const targets = parent.targets.length
        ? `target ${parent.targets.join(', ')}`
        : 'no targets';
      await proof.show(
        `${parent.name} (${targets}): ${expandable ? 'expandable' : 'LEAF'}, nested projects shown ${shown.length}/${parent.children.length}`,
      );
      expect.soft(expandable, `${parent.name} can be expanded`).toBe(true);
      expect
        .soft(shown, `${parent.name} shows its nested projects`)
        .toEqual(parent.children.map((child) => child.name));
    });
  }

  await proof.show(
    testInfo.errors.length
      ? 'RESULT: FAIL — nested projects are unreachable in the tree'
      : 'RESULT: PASS — nested projects are reachable in the tree',
  );
});
