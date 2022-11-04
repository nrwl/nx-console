import { openWorkspace } from '../utils';

describe('Nx Console should have the language server running', () => {
  before(async () => {
    await openWorkspace('nx');
  });

  it('should start the ls', async () => {
    const workbench = await browser.getWorkbench();
    const bottomBar = await workbench.getBottomBar();
    await bottomBar.maximize();
    const outputView = await bottomBar.openOutputView();
    await outputView.wait();
    await outputView.selectChannel('Nx Console Client');
    const output = await outputView.getText();
    console.log(output);
    expect(
      output.some((element) =>
        element.toLowerCase().includes('createProjectGraphAsync'.toLowerCase())
      )
    ).toBeTruthy();
  });
});
