import { defineConfig } from '@playwright/test';

type VSCodeE2EWorkerOptions = {
  vscodeVersion: string;
};

export default defineConfig<{}, VSCodeE2EWorkerOptions>({
  testDir: './specs',
  outputDir: '../../dist/apps/vscode-e2e/test-results',
  globalSetup: './setup',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  fullyParallel: true,
  reporter: [
    ['list'],
    [
      'html',
      {
        outputFolder: '../../dist/apps/vscode-e2e/playwright-report',
        open: 'never',
      },
    ],
  ],
  use: {
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'VS Code Stable',
      use: {
        vscodeVersion: 'stable',
      },
    },
  ],
});
