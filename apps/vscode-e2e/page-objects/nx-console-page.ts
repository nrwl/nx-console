import { expect, type Frame, type Locator, type Page } from '@playwright/test';
import { VSCodeEvaluator } from '../fixtures/vscode-evaluator';
import { VSCodePage } from './vscode-page';

const EXTENSION_ID = 'nrwl.angular-console';
const GENERATE_UI_CONTEXT_MENU_LABEL = 'Nx Generate (UI)';

export class NxConsolePage extends VSCodePage {
  constructor(page: Page, evaluator: VSCodeEvaluator) {
    super(page, evaluator);
  }

  get projectsSection(): Locator {
    return this.page
      .locator('.sidebar .split-view-view')
      .filter({ hasText: 'PROJECTS' });
  }

  get explorerSection(): Locator {
    return this.page
      .locator('.sidebar .split-view-view')
      .filter({ hasText: 'EXPLORER' });
  }

  async openNxConsoleSidebar(): Promise<void> {
    await this.activityBar.openTab('Nx Console');
  }

  async openExplorerSidebar(): Promise<void> {
    await this.activityBar.openTab('Explorer');
  }

  async getWorkspaceName(): Promise<string> {
    return this.evaluator.evaluate((vscodeApi) => {
      return vscodeApi.workspace.workspaceFolders?.[0]?.name ?? '';
    });
  }

  async waitForNxConsoleReady(timeout = 60_000): Promise<void> {
    await this.waitForExtension(EXTENSION_ID, timeout);
    await this.projectsSection
      .locator('.monaco-list-row')
      .first()
      .waitFor({ state: 'visible', timeout });
  }

  getProjectsTreeItems(): Locator {
    return this.projectsSection.locator('.monaco-list-row');
  }

  getProjectsTreeView(): Locator {
    return this.projectsSection.locator('.monaco-list');
  }

  getExplorerTreeItem(label: string): Locator {
    return this.explorerSection.locator(
      `.monaco-list-row[aria-label*="${label}"]`,
    );
  }

  getProject(name: string): Locator {
    return this.projectsSection.locator(
      `.monaco-list-row[aria-label=${JSON.stringify(name)}]`,
    );
  }

  async expandProject(name: string): Promise<void> {
    const item = this.getProject(name);
    await item.click();
    await this.page.keyboard.press('ArrowRight');
  }

  getTarget(targetLabel: string): Locator {
    return this.projectsSection.locator(
      `.monaco-list-row[aria-label*="${targetLabel}"]`,
    );
  }

  async openGenerateUI(): Promise<void> {
    await this.executeCommand('nx.generate.ui');
  }

  async openProjectDetails(projectName: string): Promise<void> {
    await this.executeCommand('nx.project-details.openToSide', projectName);
  }

  async getGenerateUiTitle(): Promise<string | null> {
    const frame = await this.getGenerateUiFrame();
    return (await frame.locator('[data-cy="title"]').textContent())?.trim();
  }

  async getGenerateUiSubtitle(): Promise<string | null> {
    const frame = await this.getGenerateUiFrame();
    return (await frame.locator('[data-cy="subtitle"]').textContent())?.trim();
  }

  async getGenerateUiFieldValue(fieldName: string): Promise<string> {
    const frame = await this.getGenerateUiFrame();
    const field = frame.locator(`[id="${fieldName}-field"]`);
    await field.waitFor({ state: 'visible', timeout: 30_000 });

    return field.evaluate((element) => {
      const value =
        (element as { value?: string }).value ??
        element.getAttribute('value') ??
        '';
      return `${value}`.trim();
    });
  }

  async getGenerateUiBreadcrumbText(): Promise<string | null> {
    const frame = await this.getGenerateUiFrame();
    return (
      await frame.locator('[data-cy="cwd-breadcrumb"]').textContent()
    )?.trim();
  }

  async getGenerateUiBreadcrumbPath(): Promise<string> {
    const frame = await this.getGenerateUiFrame();
    const pathSegments = await frame
      .locator('[data-cy^="cwd-breadcrumb-segment-"]')
      .evaluateAll((elements) =>
        elements
          .map((element) => element.textContent?.trim() ?? '')
          .filter((segment) => segment.length > 0),
      );

    return pathSegments.join('/');
  }

  async openGenerateUiFromProjectTreeItem(projectName: string): Promise<void> {
    await this.openNxConsoleSidebar();

    const projectItem = this.getProject(projectName);
    await projectItem.waitFor({ state: 'visible', timeout: 30_000 });

    await this.triggerContextMenuAction(
      projectItem,
      GENERATE_UI_CONTEXT_MENU_LABEL,
    );
  }

  async openGenerateUiFromExplorerFile(
    relativeFilePath: string,
  ): Promise<void> {
    await this.openExplorerSidebar();
    await this.revealFileInExplorer(relativeFilePath);

    const fileName = relativeFilePath.split('/').at(-1);
    if (!fileName) {
      throw new Error(`Could not determine file name from ${relativeFilePath}`);
    }

    const fileItem = this.getExplorerTreeItem(fileName);
    await fileItem.waitFor({ state: 'visible', timeout: 30_000 });

    await this.triggerContextMenuAction(
      fileItem,
      GENERATE_UI_CONTEXT_MENU_LABEL,
    );
  }

  private async getGenerateUiFrame(timeout = 30_000): Promise<Frame> {
    let frameUrl: string | null = null;
    await expect
      .poll(
        async () => {
          frameUrl = null;

          for (const frame of this.page.frames()) {
            const title = frame.locator('[data-cy="title"]');

            try {
              if (
                (await title.count()) > 0 &&
                (await title.first().isVisible())
              ) {
                frameUrl = frame.url();
                return frameUrl;
              }
            } catch (error) {
              if (
                error instanceof Error &&
                error.message.includes('Frame was detached')
              ) {
                continue;
              }

              throw error;
            }
          }

          return null;
        },
        { timeout },
      )
      .not.toBeNull();

    if (!frameUrl) {
      throw new Error(`Generate UI webview did not load within ${timeout}ms`);
    }

    const activeFrame = this.page
      .frames()
      .find((frame) => frame.url() === frameUrl);
    if (!activeFrame) {
      throw new Error(
        'Generate UI webview frame was found but is no longer available',
      );
    }

    return activeFrame;
  }

  private async revealFileInExplorer(relativeFilePath: string): Promise<void> {
    await this.evaluator.evaluate(async (vscodeApi, targetPath) => {
      const workspaceFolder = vscodeApi.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error('No workspace folder found');
      }

      const fileUri = `${targetPath as string}`
        .split('/')
        .filter(Boolean)
        .reduce(
          (uri, segment) => vscodeApi.Uri.joinPath(uri, segment),
          workspaceFolder.uri,
        );

      await vscodeApi.commands.executeCommand('vscode.open', fileUri);
      await vscodeApi.commands.executeCommand(
        'workbench.files.action.showActiveFileInExplorer',
      );
    }, relativeFilePath);
  }

  private async triggerContextMenuAction(
    item: Locator,
    actionLabel: string,
  ): Promise<void> {
    await item.scrollIntoViewIfNeeded();
    await item.click({ button: 'right' });

    const contextMenuItem = this.page
      .locator('.context-view .action-item')
      .filter({ hasText: actionLabel })
      .first();

    await contextMenuItem.waitFor({ state: 'visible', timeout: 10_000 });
    await contextMenuItem.click();
  }
}
