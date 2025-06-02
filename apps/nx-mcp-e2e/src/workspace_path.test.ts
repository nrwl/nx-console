import {
  createInvokeMCPInspectorCLI,
  e2eCwd,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
} from '@nx-console/shared-e2e-utils';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

describe('workspace path', () => {
  let invokeMCPInspectorCLI: Awaited<
    ReturnType<typeof createInvokeMCPInspectorCLI>
  >;
  const workspaceName = uniq('nx-mcp-smoke-test-workspace');
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
    rmSync(testWorkspacePath, { recursive: true, force: true });
  });

  it('should return the cwd of the workspace if workspace path is not provided', () => {
    const result = invokeMCPInspectorCLI(
      '--method tools/call',
      '--tool-name nx_workspace_path',
    );
    expect(result.content[0].text).toBe(testWorkspacePath);
  });

  it('should return the workspace path when provided as a positional', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_workspace_path',
    );
    expect(result.content[0].text).toBe(testWorkspacePath);
  });

  it('should return the workspace path when provided as an option', () => {
    const result = invokeMCPInspectorCLI(
      `--workspace-path ${testWorkspacePath}`,
      '--method tools/call',
      '--tool-name nx_workspace_path',
    );
    expect(result.content[0].text).toBe(testWorkspacePath);
  });
});
