import {
  CustomTreeItem,
  SideBarView,
  ViewItemAction,
  ViewSection,
} from 'wdio-vscode-service';
import {
  assertWorkspaceIsLoaded,
  closeAllSectionsExcept,
  openNxConsoleViewContainer,
  openWorkspace,
} from '../utils';

let nxConsoleViewContainer: SideBarView<unknown>;
let helpAndFeedbackSection: ViewSection;
let helpAndFeedbackItems: CustomTreeItem[];

describe('Connect to Nx Cloud button', () => {
  before(async () => {
    await openWorkspace('nx');
  });

  it('should load VSCode', assertWorkspaceIsLoaded('nx'));

  it('should show disconnected nx cloud status', async () => {
    nxConsoleViewContainer = await openNxConsoleViewContainer();

    closeAllSectionsExcept(nxConsoleViewContainer, 'HELP AND FEEDBACK');

    await browser.waitUntil(async () => {
      const view = await nxConsoleViewContainer
        .getContent()
        .getSection('HELP AND FEEDBACK');
      if (view) {
        helpAndFeedbackSection = view;
        return true;
      }
    });

    helpAndFeedbackItems = await getHelpAndFeedbackItems();

    const labels = await Promise.all(
      helpAndFeedbackItems.map((i) => i.getLabel())
    );
    expect(labels).toContain('Disconnected from Nx Cloud. Connect now?');
  });

  it('should connect to nx cloud via button', async () => {
    let connectToNxCloudTreeItem: CustomTreeItem;
    for (const item of helpAndFeedbackItems) {
      if (
        (await item.getLabel()) === 'Disconnected from Nx Cloud. Connect now?'
      ) {
        connectToNxCloudTreeItem = item;
      }
    }

    let actionButtons: ViewItemAction[];
    await browser.waitUntil(async () => {
      const abs = await connectToNxCloudTreeItem.getActionButtons();
      if (abs.length > 0) {
        actionButtons = abs;
        return true;
      }
    });

    (await actionButtons[0].elem).click();
    const workbench = await browser.getWorkbench();
    await browser.waitUntil(
      async () => {
        const notifications = await workbench.getNotifications();
        const messages = await Promise.all(
          notifications.map((n) => n.getMessage())
        );
        if (messages.includes('Connecting you to Nx Cloud...')) {
          return true;
        }
      },
      { timeoutMsg: 'Connection notification never opened.' }
    );

    await browser.waitUntil(
      async () => {
        const hafItems = await getHelpAndFeedbackItems();
        const labels = await Promise.all(hafItems.map((i) => i.getLabel()));
        if (labels.includes('You are connected to Nx Cloud!')) {
          return true;
        }
      },
      {
        timeout: 20000,
        timeoutMsg: 'Connection to Nx Cloud not established within 20s',
        interval: 1000,
      }
    );
  });
});

async function getHelpAndFeedbackItems() {
  let hafItems: CustomTreeItem[];
  await browser.waitUntil(async () => {
    const items = await helpAndFeedbackSection.getVisibleItems();
    if (items.length > 0) {
      hafItems = items as CustomTreeItem[];
      return true;
    }
  });
  return hafItems;
}
