import type { Locator, Page } from '@playwright/test';
import { VSCodeEvaluator } from '../fixtures/vscode-evaluator';
import { VSCodePage } from './vscode-page';

const EXTENSION_ID = 'nrwl.angular-console';

export class NxConsolePage extends VSCodePage {
  constructor(page: Page, evaluator: VSCodeEvaluator) {
    super(page, evaluator);
  }

  get projectsSection(): Locator {
    return this.page
      .locator('.sidebar .split-view-view')
      .filter({ hasText: 'PROJECTS' });
  }

  async openNxConsoleSidebar(): Promise<void> {
    // Clicking the activity bar tab would hide the sidebar when it is already open.
    await this.executeCommand('workbench.view.extension.nx-console');
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

  getProject(name: string): Locator {
    return this.projectsSection.locator(
      `.monaco-list-row[aria-label*="${name}"]`,
    );
  }

  /** A Projects view row whose label is exactly `label`. */
  getTreeRow(label: string): Locator {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.projectsSection.locator('.monaco-list-row').filter({
      has: this.page.locator('.label-name', {
        hasText: new RegExp(`^${escaped}$`),
      }),
    });
  }

  /** Leaf rows have no aria-expanded attribute. */
  async isTreeRowExpandable(label: string): Promise<boolean> {
    return (
      (await this.getTreeRow(label).getAttribute('aria-expanded')) !== null
    );
  }

  async expandTreeRow(label: string): Promise<void> {
    const row = this.getTreeRow(label);
    if ((await row.getAttribute('aria-expanded')) === 'false') {
      await row.locator('.monaco-tl-twistie').click();
    }
    await row.and(this.page.locator('[aria-expanded="true"]')).waitFor();
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
}
