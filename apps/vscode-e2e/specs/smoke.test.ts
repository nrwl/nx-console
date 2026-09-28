import { test, expect } from '../base-test';

test('Nx Console smoke test', async ({ nxConsole }) => {
  // Extension activates successfully
  const isActive = await nxConsole.evaluator.evaluate((vscodeApi) => {
    const ext = vscodeApi.extensions.getExtension('nrwl.angular-console');
    return ext?.isActive ?? false;
  });
  expect(isActive).toBe(true);

  // Key commands are registered
  await expect
    .poll(() => nxConsole.hasCommand('nx.generate.ui'), { timeout: 30_000 })
    .toBe(true);
  await expect
    .poll(() => nxConsole.hasCommand('nx.run.target'), { timeout: 5_000 })
    .toBe(true);

  // Activity bar shows Nx Console tab
  const nxTab = nxConsole.activityBar.getTab('Nx Console');
  await expect(nxTab).toBeVisible({ timeout: 10_000 });

  // Open Nx Console sidebar and wait for projects to load
  await nxConsole.openNxConsoleSidebar();
  const workspaceName = await nxConsole.getWorkspaceName();
  expect(workspaceName).not.toBe('');

  const projectsSection = nxConsole.projectsSection;
  const workspaceProject = nxConsole.getProject(workspaceName);
  await workspaceProject.waitFor({ state: 'visible', timeout: 90_000 });

  // Expand the workspace project to see targets
  await nxConsole.expandProject(workspaceName);
  await expect
    .poll(() => projectsSection.locator('.monaco-list-row').count(), {
      timeout: 10_000,
    })
    .toBeGreaterThan(2);

  // Expanded project shows target items
  const rowCount = await projectsSection.locator('.monaco-list-row').count();
  expect(rowCount).toBeGreaterThan(2);
});
