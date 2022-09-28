import { CustomTreeItem, SideBarView, ViewSection } from 'wdio-vscode-service';
import {
  assertWorkspaceIsLoaded,
  closeAllSectionsExcept,
  openNxConsoleViewContainer,
  openWorkspace,
} from './utils';

let nxConsoleViewContainer: SideBarView<unknown>;
let projectsSection: ViewSection;
let projectItems: CustomTreeItem[];

describe('NxConsole Projects View in an Nx workspace', () => {
  before('', async () => {
    await openWorkspace('nx');
  });

  it('should load VSCode', assertWorkspaceIsLoaded('nx'));

  it('should show projects view', async () => {
    nxConsoleViewContainer = await openNxConsoleViewContainer();

    const projectsViewElem = await nxConsoleViewContainer.elem.$(
      'h3[title="Projects"]'
    );
    await projectsViewElem.waitForExist({ timeout: 10000 });

    expect(projectsViewElem).toExist();
  });

  it('should include all projects', async () => {
    closeAllSectionsExcept(nxConsoleViewContainer, 'PROJECTS');

    projectsSection = await nxConsoleViewContainer
      .getContent()
      .getSection('PROJECTS');

    await browser.waitUntil(
      async () => {
        const pi = await projectsSection.getVisibleItems();
        if (pi.length > 0) {
          projectItems = pi as CustomTreeItem[];
          return true;
        }
      },
      { timeout: 10000, timeoutMsg: 'Never found any projects' }
    );

    const labels = await Promise.all(projectItems.map((vi) => vi.getLabel()));
    expect(labels).toEqual(['app1', 'lib1', 'lib2']);
  });

  it('should include all project targets', async () => {
    async function expandTreeViewItems(items: CustomTreeItem[]) {
      for (const item of items) {
        const isExpandable = await item.isExpandable();

        if (!isExpandable) {
          return;
        }

        await item.expand();
        const hasChildren = await item.hasChildren();

        if (hasChildren) {
          const children = await item.getChildren();
          await expandTreeViewItems(children as CustomTreeItem[]);
        }
      }
    }

    // open all projects
    await expandTreeViewItems(projectItems);

    const items = (await projectsSection.getVisibleItems()) as CustomTreeItem[];
    const labels = await Promise.all(items.map((vi) => vi.getLabel()));
    expect(labels).toEqual([
      'app1',
      'build',
      'production',
      'test',
      'lib1',
      'test',
      'lib2',
      'test',
      'weird',
    ]);
  });
});
