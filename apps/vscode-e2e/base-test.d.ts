import { type Page } from '@playwright/test';
import { VSCodeEvaluator } from './fixtures/vscode-evaluator';
import { NxConsolePage } from './page-objects/nx-console-page';
export interface LaunchOptions {
  vscodeVersion?: string;
  userSettings?: Record<string, unknown>;
  workspacePath?: string;
}
export declare const test: import('@playwright/test').TestType<
  import('@playwright/test').PlaywrightTestArgs &
    import('@playwright/test').PlaywrightTestOptions & {
      nxConsole: NxConsolePage;
    },
  import('@playwright/test').PlaywrightWorkerArgs &
    import('@playwright/test').PlaywrightWorkerOptions & {
      vscodeVersion: string;
      vscode: {
        page: Page;
        nxConsole: NxConsolePage;
        evaluator: VSCodeEvaluator;
      };
    }
>;
export { expect } from '@playwright/test';
//# sourceMappingURL=base-test.d.ts.map
