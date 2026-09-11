import { defineConfig } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { workspaceRoot } from 'nx/src/devkit-exports';
import { validateLabel } from './fixtures/vscode-e2e-runtime';

const label = validateLabel(process.env.NX_AUTOMATION_LABEL || 'run');
// Set once in the runner process; workers inherit the same run directory.
process.env.VSCODE_E2E_RUN_ID ??= `${label}-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
process.env.VSCODE_E2E_OUTPUT_DIR ??= join(
  workspaceRoot,
  'dist/apps/vscode-e2e/automation',
  process.env.VSCODE_E2E_RUN_ID,
);
const outputDir = process.env.VSCODE_E2E_OUTPUT_DIR;

export default defineConfig({
  testDir: './specs',
  outputDir: join(outputDir, 'tests'),
  globalSetup: './setup',
  timeout: 180_000,
  expect: { timeout: 30_000 },
  // Evidence comes from the first attempt; retries would hide a flaky reproduction.
  retries: 0,
  workers: 1,
  preserveOutput: 'always',
  reporter: [
    ['list'],
    ['html', { outputFolder: join(outputDir, 'report'), open: 'never' }],
    ['json', { outputFile: join(outputDir, 'results.json') }],
    ['junit', { outputFile: join(outputDir, 'junit.xml') }],
  ],
  projects: [{ name: 'VS Code' }],
});
