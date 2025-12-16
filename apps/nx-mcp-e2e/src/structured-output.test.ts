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
import { join } from 'node:path';

describe('structured output schemas', () => {
  let invokeMCPInspectorCLI: Awaited<
    ReturnType<typeof createInvokeMCPInspectorCLI>
  >;
  const workspaceName = uniq('nx-mcp-structured-output-test');
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
    await cleanupNxWorkspace(testWorkspacePath, defaultVersion);
    rmSync(testWorkspacePath, { recursive: true, force: true });
  });

  it('should have outputSchema on nx_workspace tool', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/list',
    );

    const nxWorkspaceTool = result.tools.find(
      (tool: any) => tool.name === 'nx_workspace',
    );

    expect(nxWorkspaceTool).toBeDefined();
    expect(nxWorkspaceTool.outputSchema).toBeDefined();
    expect(nxWorkspaceTool.outputSchema.type).toBe('object');
    expect(nxWorkspaceTool.outputSchema.properties).toBeDefined();
    expect(nxWorkspaceTool.outputSchema.properties.projects).toBeDefined();
    expect(nxWorkspaceTool.outputSchema.properties.dependencies).toBeDefined();
    expect(nxWorkspaceTool.outputSchema.properties.nxJson).toBeDefined();
  });

  it('should have outputSchema on nx_project_details tool', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/list',
    );

    const nxProjectDetailsTool = result.tools.find(
      (tool: any) => tool.name === 'nx_project_details',
    );

    expect(nxProjectDetailsTool).toBeDefined();
    expect(nxProjectDetailsTool.outputSchema).toBeDefined();
    expect(nxProjectDetailsTool.outputSchema.type).toBe('object');
    expect(nxProjectDetailsTool.outputSchema.properties).toBeDefined();
    expect(nxProjectDetailsTool.outputSchema.properties.name).toBeDefined();
    expect(
      nxProjectDetailsTool.outputSchema.properties.projectDependencies,
    ).toBeDefined();
    expect(
      nxProjectDetailsTool.outputSchema.properties.externalDependencies,
    ).toBeDefined();
  });
});
