import {
  assertWorkspaceIsLoaded,
  openNxConsoleViewContainer,
  openWorkspace,
} from '../utils';

describe('NxConsole Projects View in an empty workspace', function () {
  this.retries(3);

  before(async () => {
    await openWorkspace('empty');
  });

  it('should load VSCode', assertWorkspaceIsLoaded('empty'));

  it('should not show projects view', async () => {
    const nxConsoleViewContainer = await openNxConsoleViewContainer();
    const projectsViewElem = await nxConsoleViewContainer.elem.$(
      'h3[title="Projects"]'
    );
    await projectsViewElem.waitForExist({ timeout: 1000, reverse: true });

    expect(projectsViewElem).not.toExist();
  });
});
