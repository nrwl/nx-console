import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { CustomTreeItem, SideBarView, ViewSection } from 'wdio-vscode-service';

export type TestWorkspaceKind = 'empty' | 'nx' | 'ng' | 'lerna' | 'nested';
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
  await browser.waitUntil(async () => {
    return await !!workbench.getActivityBar().getViewControl('Nx Console');
  });
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

  try {
    await browser.waitUntil(async () => {
      const sections = await content.getSections();
      return sections.length > 1;
    });
  } catch (e) {
    // noop - we'll still close whatever we can
  }

  const sections = await content.getSections();

  for (const section of sections) {
    const title = await section.getTitle();
    if (
      !exception ||
      title.toLocaleUpperCase() !== exception.toLocaleUpperCase()
    ) {
      await section.collapse();
      await browser.waitUntil(async () => {
        return !(await section.isExpanded());
      });
    }
  }
}

export function changeSettingForWorkspace(
  workspace: TestWorkspaceKind,
  settingKey: string,
  settingValue: string
) {
  const testFolder = join(
    getTestWorkspacePath(),
    `testworkspace-${workspace}/`
  );
  const targetFolder = join(testFolder, '.vscode');
  if (!existsSync(targetFolder)) {
    mkdirSync(targetFolder);
  }

  const targetFile = join(targetFolder, 'settings.json');
  writeFileSync(targetFile, JSON.stringify({ [settingKey]: settingValue }));
}

export async function expandTreeViewItems(items: CustomTreeItem[]) {
  if (!items || items.length === 0) {
    return;
  }
  for (const item of items) {
    await item.expand();

    const children = await item.getChildren();
    await expandTreeViewItems(children as CustomTreeItem[]);
  }
}

export async function getSortedTreeItemLabels(
  treeViewSection: ViewSection
): Promise<string[]> {
  const items = (await treeViewSection.getVisibleItems()) as CustomTreeItem[];
  const labelPositionMap = new Map<number, { label: string; y: number }>();
  let i = 0;
  for (const item of items) {
    const label = await item.getLabel();
    const y = await item.elem.getLocation('y');
    const id = i;
    i++;
    labelPositionMap.set(id, { label, y });
  }
  const labelsSorted = Array.from(labelPositionMap.keys())
    .sort((a, b) => labelPositionMap.get(a).y! - labelPositionMap.get(b).y!)
    .map((id) => labelPositionMap.get(id).label);

  return labelsSorted;
}
