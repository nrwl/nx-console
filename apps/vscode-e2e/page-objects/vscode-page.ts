import type { Page } from '@playwright/test';
import type * as vscode from 'vscode';
import { VSCodeEvaluator } from '../fixtures/vscode-evaluator';
import { ActivityBar } from './components/activity-bar';
import { QuickPick } from './components/quick-pick';
import { Sidebar } from './components/sidebar';

export class VSCodePage {
  readonly activityBar: ActivityBar;
  readonly sidebar: Sidebar;
  readonly quickPick: QuickPick;

  constructor(
    readonly page: Page,
    readonly evaluator: VSCodeEvaluator,
  ) {
    this.activityBar = new ActivityBar(page);
    this.sidebar = new Sidebar(page);
    this.quickPick = new QuickPick(page);
  }

  async executeCommand(command: string, ...args: unknown[]): Promise<void> {
    await this.evaluator.evaluate(
      (vscodeApi, cmd, ...cmdArgs) =>
        vscodeApi.commands.executeCommand(cmd as string, ...cmdArgs),
      command,
      ...args,
    );
  }

  async hasCommand(command: string): Promise<boolean> {
    return this.evaluator.evaluate((vscodeApi, cmd) => {
      return vscodeApi.commands.getCommands(true).then((commands) => {
        return commands.includes(cmd as string);
      });
    }, command);
  }

  async waitForExtension(extensionId: string, timeout = 30_000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const isActive = await this.evaluator.evaluate((vscodeApi, id) => {
        const ext = vscodeApi.extensions.getExtension(id as string);
        return ext?.isActive ?? false;
      }, extensionId);
      if (isActive) return;
      await this.page.waitForTimeout(500);
    }
    throw new Error(
      `Extension ${extensionId} did not activate within ${timeout}ms`,
    );
  }

  async closeAllEditors(): Promise<void> {
    await this.executeCommand('workbench.action.closeAllEditors');
  }

  async resetUI(): Promise<void> {
    await this.closeAllEditors();
    await this.executeCommand('notifications.clearAll');
    await this.executeCommand('workbench.action.closePanel');
  }
}
