import type { Page } from '@playwright/test';
export declare class QuickPick {
  private readonly page;
  private readonly container;
  constructor(page: Page);
  execute(command: string): Promise<void>;
  selectItem(label: string): Promise<void>;
  isVisible(): Promise<boolean>;
}
//# sourceMappingURL=quick-pick.d.ts.map
