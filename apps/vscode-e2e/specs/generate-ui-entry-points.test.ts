import { posix } from 'node:path';
import { SEEDED_PROJECT_NAME, test, expect } from '../base-test';

const GENERATE_UI_COMMAND_LABEL = 'Nx: Generate (UI)';
const GENERATOR_LABEL = '@nx/react - component';
const TARGET_FILE_PATH = 'src/main.tsx';

test('Generate UI opens from the command palette', async ({ nxConsole }) => {
  const { workspaceName } = await getWorkspaceContext(nxConsole);

  await nxConsole.resetUI();
  await nxConsole.quickPick.execute(GENERATE_UI_COMMAND_LABEL);
  await nxConsole.quickPick.selectItem(GENERATOR_LABEL);

  await expectGenerateUiToBeOpen(nxConsole);
  await expect.poll(() => nxConsole.getGenerateUiTitle()).toBe('Component');
  await expect.poll(() => nxConsole.getGenerateUiSubtitle()).toBe('@nx/react');
  await expect
    .poll(() => nxConsole.getGenerateUiFieldValue('project'))
    .toBe(workspaceName);
});

test('Generate UI opens from the projects view project action', async ({
  nxConsole,
}) => {
  const { workspaceName } = await getWorkspaceContext(nxConsole);

  expect(SEEDED_PROJECT_NAME).not.toBe(workspaceName);

  await nxConsole.resetUI();
  await nxConsole.openGenerateUiFromProjectTreeItem(SEEDED_PROJECT_NAME);
  await nxConsole.quickPick.selectItem(GENERATOR_LABEL);

  await expectGenerateUiToBeOpen(nxConsole);
  await expect
    .poll(() => nxConsole.getGenerateUiFieldValue('project'))
    .not.toBe(workspaceName);
  await expect
    .poll(() => nxConsole.getGenerateUiFieldValue('project'))
    .toBe(SEEDED_PROJECT_NAME);
});

test('Generate UI opens from the Explorer file context menu', async ({
  nxConsole,
}) => {
  const { workspaceName } = await getWorkspaceContext(nxConsole);
  const expectedBreadcrumbPath = posix.dirname(TARGET_FILE_PATH);

  expect(expectedBreadcrumbPath).not.toBe('.');

  await nxConsole.resetUI();
  await nxConsole.openGenerateUiFromExplorerFile(TARGET_FILE_PATH);
  await nxConsole.quickPick.selectItem(GENERATOR_LABEL);

  await expectGenerateUiToBeOpen(nxConsole);
  await expect
    .poll(() => nxConsole.getGenerateUiFieldValue('project'))
    .toBe(workspaceName);
  await expect
    .poll(() => nxConsole.getGenerateUiBreadcrumbPath())
    .toBe(expectedBreadcrumbPath);
});

async function getWorkspaceContext(nxConsole: {
  waitForNxConsoleReady: () => Promise<void>;
  evaluator: {
    evaluate: <T>(
      fn: (
        vscodeApi: typeof import('vscode'),
        ...args: unknown[]
      ) => T | Promise<T>,
      ...args: unknown[]
    ) => Promise<T>;
  };
}) {
  await nxConsole.waitForNxConsoleReady();

  const workspaceName = await nxConsole.evaluator.evaluate((vscodeApi) => {
    return vscodeApi.workspace.workspaceFolders?.[0]?.name ?? '';
  });

  expect(workspaceName).not.toBe('');

  return { workspaceName };
}

async function expectGenerateUiToBeOpen(nxConsole: {
  evaluator: {
    evaluate: <T>(
      fn: (
        vscodeApi: typeof import('vscode'),
        ...args: unknown[]
      ) => T | Promise<T>,
      ...args: unknown[]
    ) => Promise<T>;
  };
}) {
  await expect
    .poll(
      () =>
        nxConsole.evaluator.evaluate((vscodeApi) => {
          return vscodeApi.window.tabGroups.all.flatMap((group) =>
            group.tabs.map((tab) => tab.label),
          );
        }),
      { timeout: 30_000 },
    )
    .toContain('Generate UI');
}
