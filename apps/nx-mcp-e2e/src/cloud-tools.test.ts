import {
  createInvokeMCPInspectorCLI,
  e2eCwd,
  modifyJsonFile,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
} from '@nx-console/shared-e2e-utils';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

describe('cloud tools', () => {
  let invokeMCPInspectorCLI: Awaited<
    ReturnType<typeof createInvokeMCPInspectorCLI>
  >;
  const workspaceName = uniq('nx-mcp-cloud-test');
  const testWorkspacePath = join(e2eCwd, workspaceName);
  const nxJsonPath = join(testWorkspacePath, 'nx.json');

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

  it('should not include cloud tools when cloud is not enabled', () => {
    const result = invokeMCPInspectorCLI('--method tools/list');
    const toolNames = result.tools.map((tool: any) => tool.name);

    // Verify cloud tools are not present
    expect(toolNames).not.toContain('nx_cloud_cipe_details');
    expect(toolNames).not.toContain('nx_cloud_fix_cipe_failure');

    // Verify other tools are still present
    expect(toolNames).toContain('nx_workspace');
    expect(toolNames).toContain('nx_project_details');
  });

  describe('with nxCloudAccessToken', () => {
    it('should include cloud tools when nxCloudAccessToken is set', () => {
      // Add nxCloudAccessToken to nx.json
      modifyJsonFile(nxJsonPath, (json) => ({
        ...json,
        nxCloudAccessToken: 'test-cloud-token',
      }));

      const result = invokeMCPInspectorCLI('--method tools/list');
      const toolNames = result.tools.map((tool: any) => tool.name);

      // Verify cloud tools are present
      expect(toolNames).toContain('nx_cloud_cipe_details');
      expect(toolNames).toContain('nx_cloud_fix_cipe_failure');

      // Verify all expected tools are present
      expect(toolNames).toEqual([
        'nx_docs',
        'nx_available_plugins',
        'nx_workspace',
        'nx_project_details',
        'nx_generators',
        'nx_generator_schema',
        'nx_cloud_cipe_details',
        'nx_cloud_fix_cipe_failure',
        'nx_current_running_tasks_details',
        'nx_current_running_task_output',
      ]);
    });

    afterEach(() => {
      // Reset nx.json
      modifyJsonFile(nxJsonPath, (json) => {
        const { nxCloudAccessToken, ...rest } = json;
        return rest;
      });
    });
  });

  describe('with nxCloudId', () => {
    it('should include cloud tools when nxCloudId is set', () => {
      // Add nxCloudId to nx.json
      modifyJsonFile(nxJsonPath, (json) => ({
        ...json,
        nxCloudId: 'test-cloud-id',
      }));

      const result = invokeMCPInspectorCLI('--method tools/list');
      const toolNames = result.tools.map((tool: any) => tool.name);

      // Verify cloud tools are present
      expect(toolNames).toContain('nx_cloud_cipe_details');
      expect(toolNames).toContain('nx_cloud_fix_cipe_failure');

      // Verify all expected tools are present
      expect(toolNames).toEqual([
        'nx_docs',
        'nx_available_plugins',
        'nx_workspace',
        'nx_project_details',
        'nx_generators',
        'nx_generator_schema',
        'nx_cloud_cipe_details',
        'nx_cloud_fix_cipe_failure',
        'nx_current_running_tasks_details',
        'nx_current_running_task_output',
      ]);
    });

    afterEach(() => {
      // Reset nx.json
      modifyJsonFile(nxJsonPath, (json) => {
        const { nxCloudId, ...rest } = json;
        return rest;
      });
    });
  });
});
