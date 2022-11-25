import { Workbench } from 'wdio-vscode-service';

import { openWorkspace } from './utils';

let workbench: Workbench;
describe('NxConsole ViewContainer', () => {
  beforeEach(async () => {
    workbench = await browser.getWorkbench();
  });

  it('should be able to load VSCode', async () => {
    expect(await workbench.getTitleBar().getTitle()).toBe(
      '[Extension Development Host] Visual Studio Code'
    );
  });

  it('should have nx console viewcontainer', async () => {
    const viewContainers = await workbench.getActivityBar().getViewControls();

    const titles = await Promise.all(viewContainers.map((vc) => vc.getTitle()));
    expect(titles).toContain('Nx Console');
  });

  describe('on an empty workspace', () => {
    before(async () => {
      await openWorkspace('empty');
    });

    it('should not have commands view', async () => {
      const nxViewContainer = await workbench
        .getActivityBar()
        .getViewControl('Nx Console');
      await nxViewContainer.wait();
      await nxViewContainer.openView();
      const openViewContainer = await workbench.getSideBar();
      const openViewContainerElem = await openViewContainer.elem;
      const commandViewElem = await openViewContainerElem.$$(
        'h3[title="Common Nx Commands"]'
      );
      expect(commandViewElem).toHaveLength(0);
    });

    it('should have welcome view', async () => {
      const nxViewContainer = await workbench
        .getActivityBar()
        .getViewControl('Nx Console');
      await nxViewContainer.wait();
      await nxViewContainer.openView();
      const openViewContainer = await workbench.getSideBar();
      const openViewContainerElem = await openViewContainer.elem;
      const welcomeViewElem = await openViewContainerElem.$$(
        'h3[title="Welcome"]'
      );
      expect(welcomeViewElem).toHaveLength(1);
    });
  });
});
