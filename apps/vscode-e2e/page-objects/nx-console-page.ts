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
    await this.activityBar.openTab('Nx Console');
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
