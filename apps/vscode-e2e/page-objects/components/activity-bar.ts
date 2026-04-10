import type { Locator, Page } from '@playwright/test';

export class ActivityBar {
  private readonly container: Locator;

  constructor(private readonly page: Page) {
    this.container = page.locator('.activitybar');
  }

  getTab(name: string): Locator {
    return this.container.locator(`[aria-label*="${name}"]`).first();
  }

  async openTab(name: string): Promise<void> {
    const tab = this.getTab(name);
    await tab.click();
  }
}
