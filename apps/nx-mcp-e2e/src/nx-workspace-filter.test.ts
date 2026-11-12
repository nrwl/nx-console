import {
  addProjectToWorkspace,
  cleanupNxWorkspace,
  createInvokeMCPInspectorCLI,
  defaultVersion,
  e2eCwd,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
} from '@nx-console/shared-e2e-utils';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

describe('nx_workspace filter', () => {
  let invokeMCPInspectorCLI: Awaited<
    ReturnType<typeof createInvokeMCPInspectorCLI>
  >;
  const workspaceName = uniq('nx-mcp-workspace-filter-test');
  const testWorkspacePath = join(e2eCwd, workspaceName);

  beforeAll(async () => {
    // Create a workspace with the default app
    newWorkspace({
      name: workspaceName,
      options: simpleReactWorkspaceOptions,
    });

    addProjectToWorkspace(testWorkspacePath, {
      name: 'admin-app',
      root: 'apps/admin-app',
      projectType: 'application',
      tags: ['type:app', 'scope:admin'],
    });
    addProjectToWorkspace(testWorkspacePath, {
      name: 'admin-app-e2e',
      root: 'apps/admin-app-e2e',
      projectType: 'application',
      implicitDependencies: ['admin-app'],
    });
    addProjectToWorkspace(testWorkspacePath, {
      name: 'shared-ui',
      root: 'libs/shared-ui',
      projectType: 'library',
      tags: ['type:ui', 'scope:shared'],
    });
    addProjectToWorkspace(testWorkspacePath, {
      name: 'e2e-app',
      root: 'apps/e2e-app',
      projectType: 'application',
      tags: ['e2e'],
    });
    addProjectToWorkspace(testWorkspacePath, {
      name: 'e2e-app-e2e',
      root: 'apps/e2e-app-e2e',
      projectType: 'application',
      implicitDependencies: ['e2e-app'],
    });

    invokeMCPInspectorCLI = await createInvokeMCPInspectorCLI(
      e2eCwd,
      workspaceName,
    );
  });

  afterAll(async () => {
    await cleanupNxWorkspace(testWorkspacePath, defaultVersion);

    rmSync(testWorkspacePath, { recursive: true, force: true });
  });

  it('should return all projects when no filter is provided', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_workspace',
    );

    const content = result.content[0]?.text || '';
    expect(content).toContain(`<${workspaceName}>`);
    expect(content).toContain('<admin-app>');
    expect(content).toContain('<shared-ui>');
    expect(content).toContain('<e2e-app>');
  });

  it('should filter by specific project names', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_workspace',
      '--tool-arg filter="admin-app,shared-ui"',
    );

    const content = result.content[0]?.text || '';
    expect(content).toContain('<admin-app>');
    expect(content).toContain('<shared-ui>');
    expect(content).not.toContain('<e2e-app>');
    expect(content).not.toContain(`<${workspaceName}>`);
  });

  it('should filter by glob pattern', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_workspace',
      '--tool-arg filter="*-app"',
    );

    const content = result.content[0]?.text || '';
    expect(content).toContain('<admin-app>');
    expect(content).toContain('<e2e-app>');
    expect(content).not.toContain('<shared-ui>');
  });

  it('should filter by tag', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_workspace',
      '--tool-arg filter="tag:type:ui"',
    );

    const content = result.content[0]?.text || '';
    expect(content).toContain('<shared-ui>');
    expect(content).not.toContain('<admin-app>');
    expect(content).not.toContain('<e2e-app>');
  });

  it('should filter by directory pattern', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_workspace',
      '--tool-arg filter="libs/*"',
    );

    const content = result.content[0]?.text || '';
    expect(content).toContain('<shared-ui>');
    expect(content).not.toContain('<admin-app>');
    expect(content).not.toContain('<e2e-app>');
  });

  it('should support exclusion patterns', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_workspace',
      '--tool-arg filter="*,!tag:e2e"',
    );

    const content = result.content[0]?.text || '';
    expect(content).toContain(`<${workspaceName}>`);
    expect(content).toContain('<admin-app>');
    expect(content).toContain('<shared-ui>');
    expect(content).not.toContain('<e2e-app>');
  });

  it('should handle filter with no matches', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_workspace',
      '--tool-arg filter="non-existent-project"',
    );

    // Should still have nx.json content but no project graph
    expect(result.content[0]?.text).toContain('nx.json');
    expect(result.content.length).toBe(1);
  });
});
