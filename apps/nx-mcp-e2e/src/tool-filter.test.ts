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

describe('tool-filter', () => {
  let invokeMCPInspectorCLI: Awaited<
    ReturnType<typeof createInvokeMCPInspectorCLI>
  >;
  const workspaceName = uniq('nx-mcp-tool-filter');
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

  it('should filter to a single tool when --tools specifies one tool', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--tools',
      'nx_docs',
      '--method',
      'tools/list',
    );
    const toolNames = result.tools.map((tool: any) => tool.name);
    expect(toolNames).toEqual(['nx_docs']);
  });

  it('should allow multiple tools with multiple --tools args', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--tools',
      'nx_docs',
      'nx_workspace',
      '--method',
      'tools/list',
    );
    const toolNames = result.tools.map((tool: any) => tool.name);
    expect(toolNames).toEqual(['nx_docs', 'nx_workspace']);
  });

  it('should support glob patterns for tool filtering', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--tools',
      'nx_*',
      '--method',
      'tools/list',
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

  it('should exclude tools matching negation patterns', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--tools',
      'nx_*',
      '!nx_docs',
      '--method',
      'tools/list',
    );
    const toolNames = result.tools.map((tool: any) => tool.name);
    expect(toolNames).not.toContain('nx_docs');
    expect(toolNames).toContain('nx_workspace');
    expect(toolNames).toContain('nx_generators');
  });

  it('should combine positive and negative patterns correctly', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--tools',
      'nx_*',
      '!nx_generators',
      '!nx_generator_schema',
      '--method',
      'tools/list',
    );
    const toolNames = result.tools.map((tool: any) => tool.name);
    expect(toolNames).toEqual([
      'nx_docs',
      'nx_available_plugins',
      'nx_workspace',
      'nx_workspace_path',
      'nx_project_details',
    ]);
  });

  it('should support negative glob patterns', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--tools',
      'nx_*',
      '!nx_generator*',
      '--method',
      'tools/list',
    );
    const toolNames = result.tools.map((tool: any) => tool.name);
    expect(toolNames).toEqual([
      'nx_docs',
      'nx_available_plugins',
      'nx_workspace',
      'nx_workspace_path',
      'nx_project_details',
    ]);
  });
});
