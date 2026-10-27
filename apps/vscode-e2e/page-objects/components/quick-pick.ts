import type { Locator, Page } from '@playwright/test';
import { getCommandPaletteShortcut } from '../../fixtures/vscode-e2e-runtime';

export class QuickPick {
  private readonly container: Locator;

  constructor(private readonly page: Page) {
    this.container = page.locator('.quick-input-widget');
  }

  async execute(command: string): Promise<void> {
    await this.page.keyboard.press(getCommandPaletteShortcut());
    // The palette starts with ">"; replacing it would switch to file search.
    await this.container.locator('.input').fill(`>${command}`);
    await this.page
      .locator(`.quick-input-list .monaco-list-row[aria-label*="${command}"]`)
      .first()
      .click();
  }

  async selectItem(label: string): Promise<void> {
    // Long lists are virtualized, so narrow them down before looking for the row.
    await this.container.locator('.input').waitFor();
    await this.page.keyboard.insertText(label);
    await this.page
      .locator(`.quick-input-list .monaco-list-row[aria-label*="${label}"]`)
      .first()
      .click();
  }

  async isVisible(): Promise<boolean> {
    return this.container.isVisible();
  }
}
