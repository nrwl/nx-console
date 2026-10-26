import { posix } from 'node:path';
import { expect, test } from '../base-test';
import type { NxConsolePage } from '../page-objects/nx-console-page';

test.use({ vscodeOptions: { fixture: 'generate-ui' } });

const GENERATE_UI_COMMAND_LABEL = 'Nx: Generate (UI)';
const GENERATOR_LABEL = '@nx/workspace - run-commands';
const ROOT_PROJECT_NAME = 'app';
const PROJECT_VIEW_PROJECT_NAME = 'extra';
const TARGET_FILE_PATH = 'src/main.ts';

test('Generate UI opens from the command palette', async ({ vscode }) => {
  const { nxConsole } = vscode;
  const proof = vscode.proof([
    'Generate UI from the command palette',
    vscode.build,
    '',
  ]);

  await nxConsole.openNxConsoleSidebar();
  await nxConsole.waitForNxConsoleReady();
  await nxConsole.resetUI();
  await nxConsole.quickPick.execute(GENERATE_UI_COMMAND_LABEL);
  await nxConsole.quickPick.selectItem(GENERATOR_LABEL);

  await expectGenerateUiToBeOpen(nxConsole);
  const subtitle = await nxConsole.getGenerateUiSubtitle();
  const project = await nxConsole.getGenerateUiFieldValue('project');
  await proof.show(
    `subtitle: ${subtitle?.split(/\s+/)[0]}, project field: "${project}"`,
  );
  expect.soft(subtitle).toMatch(/^@nx\/workspace\s/);
  // Without a file or project as context, no project is preselected.
  expect.soft(project).toBe('');
});

test('Generate UI opens from the projects view project action', async ({
  vscode,
}) => {
  const { nxConsole } = vscode;
  const proof = vscode.proof([
    `Generate UI from the Projects view context menu of "${PROJECT_VIEW_PROJECT_NAME}"`,
    vscode.build,
    '',
  ]);

  await nxConsole.openNxConsoleSidebar();
  await nxConsole.waitForNxConsoleReady();
  await nxConsole.resetUI();
  await nxConsole.openGenerateUiFromProjectTreeItem(PROJECT_VIEW_PROJECT_NAME);
  await nxConsole.quickPick.selectItem(GENERATOR_LABEL);

  await expectGenerateUiToBeOpen(nxConsole);
  await expect
    .poll(() => nxConsole.getGenerateUiFieldValue('project'))
    .toBe(PROJECT_VIEW_PROJECT_NAME);
  await proof.show(
    `project field: "${await nxConsole.getGenerateUiFieldValue('project')}"`,
  );
});

test('Generate UI opens from the Explorer file context menu', async ({
  vscode,
}) => {
  const { nxConsole } = vscode;
  const expectedBreadcrumbPath = posix.dirname(TARGET_FILE_PATH);
  const proof = vscode.proof([
    `Generate UI from the Explorer context menu of ${TARGET_FILE_PATH}`,
    vscode.build,
    '',
  ]);

  await nxConsole.openNxConsoleSidebar();
  await nxConsole.waitForNxConsoleReady();
  await nxConsole.resetUI();
  await nxConsole.openGenerateUiFromExplorerFile(TARGET_FILE_PATH);
  await nxConsole.quickPick.selectItem(GENERATOR_LABEL);

  await expectGenerateUiToBeOpen(nxConsole);
  await expect
    .poll(() => nxConsole.getGenerateUiFieldValue('project'))
    .toBe(ROOT_PROJECT_NAME);
  await expect
    .poll(() => nxConsole.getGenerateUiBreadcrumbPath())
    .toBe(expectedBreadcrumbPath);
  await proof.show(
    `project field: "${await nxConsole.getGenerateUiFieldValue('project')}", breadcrumb: "${await nxConsole.getGenerateUiBreadcrumbPath()}"`,
  );
});

async function expectGenerateUiToBeOpen(nxConsole: NxConsolePage) {
  await expect
    .poll(
      () =>
        nxConsole.evaluator.evaluate((vscodeApi) =>
          vscodeApi.window.tabGroups.all.flatMap((group) =>
            group.tabs.map((tab) => tab.label),
          ),
        ),
      { timeout: 30_000 },
    )
    .toContain('Generate UI');
}
