import type { Locator, Page } from '@playwright/test';
import { VSCodeEvaluator } from '../fixtures/vscode-evaluator';
import { VSCodePage } from './vscode-page';
export declare class NxConsolePage extends VSCodePage {
  constructor(page: Page, evaluator: VSCodeEvaluator);
  get projectsSection(): Locator;
  openNxConsoleSidebar(): Promise<void>;
  waitForNxConsoleReady(timeout?: number): Promise<void>;
  getProjectsTreeItems(): Locator;
  getProjectsTreeView(): Locator;
  getProject(name: string): Locator;
  expandProject(name: string): Promise<void>;
  getTarget(targetLabel: string): Locator;
  openGenerateUI(): Promise<void>;
  openProjectDetails(projectName: string): Promise<void>;
}
//# sourceMappingURL=nx-console-page.d.ts.map
