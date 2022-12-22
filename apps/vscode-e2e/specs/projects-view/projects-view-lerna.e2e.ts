import { CustomTreeItem, SideBarView, ViewSection } from 'wdio-vscode-service';
import {
  assertWorkspaceIsLoaded,
  closeAllSectionsExcept,
  getSortedTreeItemLabels,
  openNxConsoleViewContainer,
  openWorkspace,
} from '../utils';

let nxConsoleViewContainer: SideBarView<unknown>;
let projectsSection: ViewSection;
let projectItems: CustomTreeItem[];

describe('NxConsole Projects View in a Lerna workspace', function () {
  this.retries(3);

  before('', async () => {
    await openWorkspace('lerna');
  });

  it('should load VSCode', assertWorkspaceIsLoaded('lerna'));

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
    expect(labels).toEqual(['pkg1', 'pkg2']);
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

    const labels = await getSortedTreeItemLabels(projectsSection);
    expect(labels).toEqual([
      'pkg1',
      'build',
      'test',
      'pkg2',
      'build',
      'test',
      'extra',
    ]);
  });
});
