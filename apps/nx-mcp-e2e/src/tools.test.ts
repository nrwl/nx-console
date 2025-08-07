import {
  cleanupNxWorkspace,
  createInvokeMCPInspectorCLI,
  defaultVersion,
  e2eCwd,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
} from '@nx-console/shared-e2e-utils';
import { rmSync } from 'node:fs';
import { platform } from 'node:os';
import { join } from 'node:path';

describe('tools', () => {
  let invokeMCPInspectorCLI: Awaited<
    ReturnType<typeof createInvokeMCPInspectorCLI>
  >;
  const workspaceName = uniq('nx-mcp-smoke-test');
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

  afterAll(async () => {
    // Clean up Nx workspace processes before attempting to remove directory
    await cleanupNxWorkspace(testWorkspacePath, defaultVersion);

    rmSync(testWorkspacePath, { recursive: true, force: true });
  });

  it('should ensure that the server starts and lists the expected tools for an Nx workspace', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/list',
    );
    const toolNames = result.tools.map((tool: any) => tool.name);
    expect(toolNames).toEqual([
      'nx_docs',
      'nx_available_plugins',
      'nx_workspace',
      'nx_workspace_path',
      'nx_project_details',
      'nx_generators',
      'nx_generator_schema',
    ]);
  });
});
