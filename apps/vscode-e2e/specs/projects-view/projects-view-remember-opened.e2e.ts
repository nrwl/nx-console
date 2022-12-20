import {
  CustomTreeItem,
  CustomTreeSection,
  SideBarView,
  ViewSection,
} from 'wdio-vscode-service';
import {
  assertWorkspaceIsLoaded,
  changeSettingForWorkspace,
  closeAllSectionsExcept,
  getSortedTreeItemLabels,
  openNxConsoleViewContainer,
  openWorkspace,
} from '../utils';

let nxConsoleViewContainer: SideBarView<unknown>;
let projectsSection: ViewSection;

describe('NxConsole Projects View should remember opened treeitems', function () {
  this.retries(3);
  before('', async () => {
    changeSettingForWorkspace('nx', 'nxConsole.projectViewingStyle', 'tree');
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

  it('should open some projects', async () => {
    closeAllSectionsExcept(nxConsoleViewContainer, 'PROJECTS');

    projectsSection = (await nxConsoleViewContainer
      .getContent()
      .getSection('PROJECTS')) as CustomTreeSection;

    await browser.waitUntil(
      async () => {
        const pi = await projectsSection.getVisibleItems();
        if (pi.length > 0) {
          return true;
        }
      },
      { timeout: 10000, timeoutMsg: 'Never found any projects' }
    );

    async function expandTreeItem(label: string) {
      const treeItem = (await projectsSection.findItem(
        label
      )) as CustomTreeItem;
      treeItem.expand();
      await browser.waitUntil(async () => {
        return (await treeItem.getChildren()).length > 0;
      });
    }

    await expandTreeItem('apps');
    await expandTreeItem('app1');
    await expandTreeItem('build');
    await expandTreeItem('libs');
    await expandTreeItem('lib2');

    const projectItems =
      (await projectsSection.getVisibleItems()) as CustomTreeItem[];

    const labels = await Promise.all(projectItems.map((vi) => vi.getLabel()));
    expect(labels).toEqual([
      'apps',
      'app1',
      'build',
      'production',
      'test',
      'libs',
      'lib1',
      'lib2',
      'test',
      'weird',
    ]);
  });

  it('should reload and see the same open projects', async () => {
    try {
      console.log('before list view');
      changeSettingForWorkspace('nx', 'nxConsole.projectViewingStyle', 'list');
      console.log('after list view');
      changeSettingForWorkspace('nx', 'nxConsole.projectViewingStyle', 'tree');
      console.log('after tree view');

      console.log('before get visible items');
      await browser.waitUntil(
        async () => {
          const pi = await projectsSection.getVisibleItems();
          console.log('visible items length', pi.length);
          if (pi.length > 0) {
            return true;
          }
        },
        { timeout: 10000, timeoutMsg: 'Never found any projects' }
      );
      console.log('after get visible items');

      const labels = getSortedTreeItemLabels(projectsSection);

      expect(labels).toEqual([
        'apps',
        'app1',
        'build',
        'production',
        'test',
        'libs',
        'lib1',
        'lib2',
        'test',
        'weird',
      ]);
    } catch (error) {
      console.log(error);
    }
  });
});
