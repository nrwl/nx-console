import {
  createInvokeMCPInspectorCLI,
  e2eCwd,
  logWindowsFileLocks,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
} from '@nx-console/shared-e2e-utils';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { platform } from 'node:os';
import { join } from 'node:path';

describe('workspace detection', () => {
  let invokeMCPInspectorCLI: Awaited<
    ReturnType<typeof createInvokeMCPInspectorCLI>
  >;

  describe('with nx workspace', () => {
    const workspaceName = uniq('nx-mcp-nx-workspace-test');
    const testWorkspacePath = join(e2eCwd, workspaceName);

    beforeAll(async () => {
      newWorkspace({
        name: workspaceName,
        options: simpleReactWorkspaceOptions,
      });
      invokeMCPInspectorCLI = await createInvokeMCPInspectorCLI(
        e2eCwd,
        workspaceName,
      );
    });

    afterAll(() => {
      if (platform() === 'win32') {
        logWindowsFileLocks(testWorkspacePath);
      }
      rmSync(testWorkspacePath, { recursive: true, force: true });
    });

    it('should have workspace-specific tools when cwd is nx workspace', () => {
      const result = invokeMCPInspectorCLI('--method tools/list');
      const toolNames = result.tools.map((tool: any) => tool.name);

      expect(toolNames).toContain('nx_docs');
      expect(toolNames).toContain('nx_available_plugins');
      expect(toolNames).toContain('nx_workspace_path');
      expect(toolNames).toContain('nx_workspace');
      expect(toolNames).toContain('nx_project_details');
    });
  });

  describe('with non-existent path', () => {
    const workspaceName = uniq('nx-mcp-temp-workspace');

    beforeAll(async () => {
      mkdirSync(join(e2eCwd, workspaceName), { recursive: true });
      invokeMCPInspectorCLI = await createInvokeMCPInspectorCLI(
        e2eCwd,
        workspaceName,
      );
    });

    afterAll(() => {
      rmSync(join(e2eCwd, workspaceName), { recursive: true, force: true });
    });

    it('should not have workspace tools when pointing to non-existent path', () => {
      const nonExistentPath = '/this/path/does/not/exist';
      const result = invokeMCPInspectorCLI(
        nonExistentPath,
        '--method tools/list',
      );
      const toolNames = result.tools.map((tool: any) => tool.name);

      expect(toolNames).toContain('nx_docs');
      expect(toolNames).toContain('nx_available_plugins');
      expect(toolNames).not.toContain('nx_workspace_path');
      expect(toolNames).not.toContain('nx_workspace');
      expect(toolNames).not.toContain('nx_project_details');
    });
  });

  describe('with empty directory', () => {
    const workspaceName = uniq('nx-mcp-empty-dir');
    const emptyDirPath = join(e2eCwd, workspaceName);

    beforeAll(async () => {
      mkdirSync(emptyDirPath, { recursive: true });
      writeFileSync(
        join(emptyDirPath, 'README.md'),
        'This is not an nx workspace',
      );

      invokeMCPInspectorCLI = await createInvokeMCPInspectorCLI(
        e2eCwd,
        workspaceName,
      );
    });

    afterAll(() => {
      rmSync(emptyDirPath, { recursive: true, force: true });
    });

    it('should not have workspace tools when pointing to empty directory', () => {
      const result = invokeMCPInspectorCLI(emptyDirPath, '--method tools/list');
      const toolNames = result.tools.map((tool: any) => tool.name);

      expect(toolNames).toContain('nx_docs');
      expect(toolNames).toContain('nx_available_plugins');
      expect(toolNames).not.toContain('nx_workspace_path');
      expect(toolNames).not.toContain('nx_workspace');
      expect(toolNames).not.toContain('nx_project_details');
    });
  });
});
