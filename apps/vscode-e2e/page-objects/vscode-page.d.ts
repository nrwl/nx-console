import type { Page } from '@playwright/test';
import { VSCodeEvaluator } from '../fixtures/vscode-evaluator';
import { ActivityBar } from './components/activity-bar';
import { QuickPick } from './components/quick-pick';
import { Sidebar } from './components/sidebar';
export declare class VSCodePage {
  readonly page: Page;
  readonly evaluator: VSCodeEvaluator;
  readonly activityBar: ActivityBar;
  readonly sidebar: Sidebar;
  readonly quickPick: QuickPick;
  constructor(page: Page, evaluator: VSCodeEvaluator);
  executeCommand(command: string, ...args: unknown[]): Promise<void>;
  hasCommand(command: string): Promise<boolean>;
  waitForExtension(extensionId: string, timeout?: number): Promise<void>;
  closeAllEditors(): Promise<void>;
  resetUI(): Promise<void>;
}
//# sourceMappingURL=vscode-page.d.ts.map
