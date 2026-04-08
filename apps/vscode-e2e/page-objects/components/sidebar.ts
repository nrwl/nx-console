import type { Locator, Page } from '@playwright/test';

export class Sidebar {
  constructor(private readonly page: Page) {}

  private get container(): Locator {
    return this.page.locator('.sidebar');
  }

  getSection(name: string): Locator {
    return this.container.locator(`[aria-label*="${name}"]`);
  }

  getTree(): Locator {
    return this.container.locator('.pane-body .monaco-list');
  }

  getTreeItem(label: string): Locator {
    return this.container.locator(`.monaco-list-row[aria-label*="${label}"]`);
  }

  getTreeItems(): Locator {
    return this.container.locator('.monaco-list-row');
  }

  async expandTreeItem(label: string): Promise<void> {
    const item = this.getTreeItem(label);
    const isExpanded = await item.getAttribute('aria-expanded');
    if (isExpanded !== 'true') {
      await item.click();
    }
  }
}
