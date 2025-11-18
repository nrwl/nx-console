import {
  cleanupNxWorkspace,
  createInvokeMCPInspectorCLI,
  defaultVersion,
  e2eCwd,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
} from '@nx-console/shared-e2e-utils';
import { exec } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

describe('nx_workspace select', () => {
  let invokeMCPInspectorCLI: Awaited<
    ReturnType<typeof createInvokeMCPInspectorCLI>
  >;
  const workspaceName = uniq('nx-mcp-workspace-select-test');
  const testWorkspacePath = join(e2eCwd, workspaceName);

  beforeAll(async () => {
    // Create a workspace with the default app
    newWorkspace({
      name: workspaceName,
      options: simpleReactWorkspaceOptions,
    });

    // Generate a few additional projects
    await promisify(exec)(
      `npx nx g @nx/react:app admin-app --tags=type:app,scope:admin --directory=apps/admin-app --no-interactive`,
      { cwd: testWorkspacePath },
    );

    await promisify(exec)(
      `npx nx g @nx/react:library shared-ui --tags=type:ui,scope:shared --directory=libs/shared-ui --no-interactive`,
      { cwd: testWorkspacePath },
    );

    invokeMCPInspectorCLI = await createInvokeMCPInspectorCLI(
      e2eCwd,
      workspaceName,
    );
  });

  afterAll(async () => {
    await cleanupNxWorkspace(testWorkspacePath, defaultVersion);

    rmSync(testWorkspacePath, { recursive: true, force: true });
  });

  it('should return compressed format when no select is provided', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_workspace',
    );

    const content = result.content[1]?.text || '';
    expect(content).toContain(`<${workspaceName}>`);
    expect(content).toContain('<admin-app>');
    expect(content).toContain('<shared-ui>');
    // Should not be JSON
    expect(content.trim().startsWith('[')).toBe(false);
  });

  it('should return JSON when select is provided', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_workspace',
      '--tool-arg select="targets.build"',
    );

    const content = result.content[0]?.text || '';
    // Should be valid JSON
    const parsed = JSON.parse(content);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    
    // Check structure
    const appResult = parsed.find((p: any) => p.projectName === workspaceName);
    expect(appResult).toBeDefined();
    expect(appResult.value).toBeDefined();
    expect(appResult.value.executor).toBeDefined();
  });

  it('should select specific property', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_workspace',
      '--tool-arg select="root"',
    );

    const content = result.content[0]?.text || '';
    const parsed = JSON.parse(content);
    
    const appResult = parsed.find((p: any) => p.projectName === workspaceName);
    expect(appResult.value).toBe('.');
    
    const libResult = parsed.find((p: any) => p.projectName === 'shared-ui');
    expect(libResult.value).toBe('libs/shared-ui');
  });

  it('should handle missing properties with null', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_workspace',
      '--tool-arg select="non.existent.prop"',
    );

    const content = result.content[0]?.text || '';
    const parsed = JSON.parse(content);
    
    const appResult = parsed.find((p: any) => p.projectName === workspaceName);
    expect(appResult.value).toBeNull();
  });

  it('should combine filter and select', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_workspace',
      '--tool-arg filter="shared-ui"',
      '--tool-arg select="root"',
    );

    const content = result.content[0]?.text || '';
    const parsed = JSON.parse(content);
    
    expect(parsed).toHaveLength(1);
    expect(parsed[0].projectName).toBe('shared-ui');
    expect(parsed[0].value).toBe('libs/shared-ui');
  });
});
