import {
  createMCPServerForE2E,
  e2eCwd,
  MCPServerForE2E,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
} from '@nx-console/shared-e2e-utils';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

describe('tools', () => {
  let mcpServer: MCPServerForE2E;
  const workspaceName = uniq('nx-mcp-smoke-test');
  const testWorkspacePath = join(e2eCwd, workspaceName);

  beforeAll(async () => {
    newWorkspace({
      name: workspaceName,
      options: simpleReactWorkspaceOptions,
    });
    mcpServer = await createMCPServerForE2E(e2eCwd);
  });

  afterAll(() => {
    mcpServer.killMCPServer();
    rmSync(testWorkspacePath, { recursive: true, force: true });
  });

  it('should ensure that the server starts and lists the expected tools for an Nx workspace', () => {
    const result = mcpServer.invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/list',
    );
    const toolNames = result.tools.map((tool: any) => tool.name);
    expect(toolNames).toEqual([
      'nx_docs',
      'nx_available_plugins',
      'nx_workspace',
      'nx_project_details',
      'nx_generators',
      'nx_generator_schema',
      'nx_current_running_tasks_details',
      'nx_current_running_task_output',
    ]);
  });
});
