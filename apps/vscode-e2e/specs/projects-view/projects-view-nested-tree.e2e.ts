import { CustomTreeItem, SideBarView, ViewSection } from 'wdio-vscode-service';
import {
  assertWorkspaceIsLoaded,
  changeSettingForWorkspace,
  closeAllSectionsExcept,
  openNxConsoleViewContainer,
  openWorkspace,
} from '../utils';

let nxConsoleViewContainer: SideBarView<unknown>;
let projectsSection: ViewSection;
let projectItems: CustomTreeItem[];

describe('NxConsole Projects View in a nested Nx workspace', function () {
  this.retries(3);

  before('', async () => {
    changeSettingForWorkspace(
      'nested',
      'nxConsole.projectViewingStyle',
      'tree'
    );
    await openWorkspace('nested');
  });

  it('should load VSCode', assertWorkspaceIsLoaded('nested'));

  it('should show projects view', async () => {
    nxConsoleViewContainer = await openNxConsoleViewContainer();

    const projectsViewElem = await nxConsoleViewContainer.elem.$(
      'h3[title="Projects"]'
    );
    await projectsViewElem.waitForExist({ timeout: 10000 });

    expect(projectsViewElem).toExist();
  });

  it('should include root project', async () => {
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
    expect(labels).toEqual(['app1']);
  });

  it('should include all project targets', async () => {
    async function expandTreeViewItems(items: CustomTreeItem[]) {
      if (!items || items.length === 0) {
        return;
      }
      for (const item of items) {
        await item.expand();

        const children = await item.getChildren();
        await expandTreeViewItems(children as CustomTreeItem[]);
      }
    }

    // open all projects
    await expandTreeViewItems(projectItems);

    const items = (await projectsSection.getVisibleItems()) as CustomTreeItem[];
    const labels = await Promise.all(items.map((vi) => vi.getLabel()));
    expect(labels).toEqual([
      'app1',
      'start',
      'build',
      'development',
      'production',
      'test',
      'serve',
      'development',
      'production',
      'e2e',
      'e2e',
      'production',
      'libs',
      'lib1',
      'test',
      'lib1-nestedlib',
      'test',
      'lib2',
    ]);
  });
});
