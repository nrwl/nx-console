import {
  cleanupNxWorkspace,
  createInvokeMCPInspectorCLI,
  defaultVersion,
  e2eCwd,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
} from '@nx-console/shared-e2e-utils';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
describe('broken project graph', () => {
  let invokeMCPInspectorCLI: Awaited<
    ReturnType<typeof createInvokeMCPInspectorCLI>
  >;
  const workspaceName = uniq('nx-mcp-broken-graph-test');
  const testWorkspacePath = join(e2eCwd, workspaceName);
  beforeAll(async () => {
    newWorkspace({
      name: workspaceName,
      options: simpleReactWorkspaceOptions,
    });
    // Break the nx.json file by introducing a syntax error
    const nxJsonPath = join(testWorkspacePath, 'nx.json');
    const nxJsonContent = readFileSync(nxJsonPath, 'utf-8');
    // Introduce a syntax error - remove closing brace and add invalid JSON
    const brokenNxJson = nxJsonContent.slice(0, -2) + ',invalid json syntax';
    writeFileSync(nxJsonPath, brokenNxJson);
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
  it('should start MCP server and have tools available even with broken nx.json', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/list',
    );
    const toolNames = result.tools.map((tool: any) => tool.name);
    // Should still have basic tools available
    expect(toolNames).toContain('nx_docs');
    expect(toolNames).toContain('nx_available_plugins');
    // Workspace-specific tools should still be available as the MCP should handle errors gracefully
    expect(toolNames).toContain('nx_workspace');
    expect(toolNames).toContain('nx_workspace_path');
    expect(toolNames).toContain('nx_project_details');
    expect(toolNames).toContain('nx_generators');
    expect(toolNames).toContain('nx_generator_schema');
  });
  it('should be able to call nx_workspace_path even with broken project graph', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call --tool-name nx_workspace_path',
    );
    // Should return the workspace path despite the broken nx.json
    expect(result.content).toBeDefined();
    expect(result.content[0].text).toContain(testWorkspacePath);
  });
  it('should handle nx_workspace tool gracefully with broken project graph', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call --tool-name nx_workspace',
    );
    // Should return some result even if it includes error information
    expect(result.content).toBeDefined();
    // The content should mention the error or still provide partial information
    expect(result.content[0].text).toBeDefined();
  });
});
