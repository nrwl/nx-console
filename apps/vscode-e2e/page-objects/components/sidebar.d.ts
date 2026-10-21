import type { Locator, Page } from '@playwright/test';
export declare class Sidebar {
  private readonly page;
  constructor(page: Page);
  private get container();
  getSection(name: string): Locator;
  getTree(): Locator;
  getTreeItem(label: string): Locator;
  getTreeItems(): Locator;
  expandTreeItem(label: string): Promise<void>;
}
//# sourceMappingURL=sidebar.d.ts.map
