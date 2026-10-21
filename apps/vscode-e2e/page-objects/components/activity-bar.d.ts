import type { Locator, Page } from '@playwright/test';
export declare class ActivityBar {
  private readonly page;
  private readonly container;
  constructor(page: Page);
  getTab(name: string): Locator;
  openTab(name: string): Promise<void>;
}
//# sourceMappingURL=activity-bar.d.ts.map
