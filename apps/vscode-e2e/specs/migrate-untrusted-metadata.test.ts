import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Frame, Page } from '@playwright/test';
import { expect, test } from '../base-test';

test.use({ vscodeOptions: { fixture: 'migrate-untrusted-metadata' } });

async function findMigrateSidebarFrame(page: Page): Promise<Frame> {
  let found: Frame | undefined;
  await expect
    .poll(
      async () => {
        for (const frame of page.frames()) {
          const count = await frame
            .locator('root-element[migrateViewData]')
            .count()
            .catch(() => 0);
          if (count > 0) {
            found = frame;
            return true;
          }
        }
        return false;
      },
      { timeout: 60_000 },
    )
    .toBe(true);
  return found!;
}

test('migrations.json metadata stays data in the migrate sidebar', async ({
  vscode,
}, testInfo) => {
  test.setTimeout(240_000);
  const { nxConsole, page, workspacePath } = vscode;
  const proof = vscode.proof([
    'Migrate sidebar with crafted migrations.json metadata',
    vscode.build,
    '',
  ]);
  const marker = join(workspacePath, 'injected-git-ref');

  await nxConsole.openNxConsoleSidebar();
  await nxConsole.waitForNxConsoleReady();
  await nxConsole.executeCommand('nxMigrate.focus');

  const frame = await findMigrateSidebarFrame(page);
  const cancel = frame.locator('vscode-button', { hasText: 'Cancel' });
  await expect(cancel).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: testInfo.outputPath('sidebar.png') });

  const injectedElements = (
    await Promise.all(
      page.frames().map((f) =>
        f
          .locator('#injected-markup')
          .count()
          .catch(() => 0),
      ),
    )
  ).reduce((a, b) => a + b, 0);
  const subject = await frame
    .locator('root-element')
    .evaluate(
      (element: any) =>
        element.migrateViewData?.migrationsJsonSection?.initialGitRef?.subject,
    );
  const csp = await frame
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content');
  await proof.show(`injected elements in any frame: ${injectedElements}`);
  await proof.show(
    `subject reached the component as text: ${JSON.stringify(subject)}`,
  );
  await proof.show(`sidebar CSP: ${csp}`);
  expect.soft(injectedElements).toBe(0);
  expect.soft(subject).toBe(`'"><img id="injected-markup" src="x">`);
  expect.soft(csp).toContain("default-src 'none'");

  await cancel.click();
  const refused = page
    .locator('.notifications-toasts')
    .getByText('is not a commit SHA');
  await expect.soft(refused).toBeVisible({ timeout: 15_000 });
  const modalShown = await page.locator('.monaco-dialog-box').isVisible();
  await page.screenshot({ path: testInfo.outputPath('cancel.png') });
  await proof.show(`Cancel refused the ref: ${await refused.isVisible()}`);
  await proof.show(`reset confirmation dialog shown: ${modalShown}`);
  await proof.show(`marker file created by a shell: ${existsSync(marker)}`);
  expect.soft(modalShown).toBe(false);
  expect.soft(existsSync(marker)).toBe(false);
});

test("VS Code's MCP client reaches the loopback-only MCP server", async ({
  vscode,
}) => {
  test.setTimeout(120_000);
  const { evaluator } = vscode;
  const proof = vscode.proof([
    'Nx Console MCP server: Host and Origin checks',
    vscode.build,
    '',
  ]);
  const port = 9944;

  // Nx Console registers its server with VS Code only after it has picked the
  // port, so starting servers right after launch can find nothing to start yet.
  let tools: string[] = [];
  await expect
    .poll(
      async () => {
        tools = await evaluator.evaluate(async (api) => {
          await api.commands.executeCommand('workbench.mcp.startServer', '*', {
            waitForLiveTools: true,
            autoTrustChanges: true,
          });
          return api.lm.tools
            .map((tool) => tool.name)
            .filter((name) => name.startsWith('mcp_nx_mcp_'));
        });
        return tools;
      },
      { timeout: 90_000, intervals: [2_000] },
    )
    .toContain('mcp_nx_mcp_nx_docs');
  await proof.show(`tools VS Code loaded from the server: ${tools.length}`);

  const status = async (headers: Record<string, string>) =>
    (
      await fetch(`http://127.0.0.1:${port}/mcp`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          ...headers,
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
      })
    ).status;
  const crossSite = await status({ origin: 'https://attacker.example' });
  await proof.show(`request from a cross-site page: ${crossSite}`);
  expect.soft(crossSite).toBe(403);
});
