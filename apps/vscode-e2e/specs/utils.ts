import { join } from 'path';
import { SideBarView } from 'wdio-vscode-service';

export type TestWorkspaceKind = 'empty' | 'nx' | 'ng';
export async function openWorkspace(workspace: TestWorkspaceKind) {
  const testFolder = join(
    getTestWorkspacePath(),
    `testworkspace-${workspace}/`
  );
  browser.executeWorkbench((vscode, folderToOpen) => {
    vscode.commands.executeCommand(
      'vscode.openFolder',
      vscode.Uri.parse(folderToOpen)
    );
  }, testFolder);
  const workbench = await browser.getWorkbench();
  await browser.waitUntil(
    async () => {
      const title = await workbench.getTitleBar().getTitle();
      return title.includes(`testworkspace-${workspace}`);
    },
    {
      timeout: 600000,
      timeoutMsg: `Never opened testworkspace-${workspace}`,
      interval: 1000,
    }
  );
}

export function assertWorkspaceIsLoaded(workspace: TestWorkspaceKind) {
  return async () => {
    const workbench = await browser.getWorkbench();
    expect(await workbench.getTitleBar().getTitle()).toContain(
      `[Extension Development Host] testworkspace-${workspace}`
    );
  };
}

export function getTestWorkspacePath() {
  return join(__dirname, '../../../../', 'testworkspaces');
}

export async function openNxConsoleViewContainer() {
  const workbench = await browser.getWorkbench();
  await workbench.wait();
  const nxActivityBaritem = await workbench
    .getActivityBar()
    .getViewControl('Nx Console');
  await nxActivityBaritem.wait();
  await nxActivityBaritem.openView();
  const nxViewContainer = await workbench.getSideBar();
  await nxViewContainer.wait();
  return nxViewContainer;
}

export async function closeAllSectionsExcept(
  viewContainer: SideBarView<unknown>,
  exception?: string
) {
  const content = await viewContainer.getContent();
  await content.wait();

  await browser.waitUntil(async () => {
    const sections = await content.getSections();
    return sections.length > 0;
  });

  const sections = await content.getSections();

  for (const section of sections) {
    const title = await section.getTitle();
    if (
      !exception ||
      title.toLocaleUpperCase() !== exception.toLocaleUpperCase()
    ) {
      await section.collapse();
    }
  }
}
