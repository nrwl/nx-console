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

describe('nx_project_details filter', () => {
  let invokeMCPInspectorCLI: Awaited<
    ReturnType<typeof createInvokeMCPInspectorCLI>
  >;
  const workspaceName = uniq('nx-mcp-project-details-filter');
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

  it('should return full project details when no filter is provided', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
    );

    // Should have 3 content blocks: Project Details, Project Dependencies, External Dependencies
    expect(result.content).toHaveLength(3);
    expect(result.content[0]?.text).toContain('Project Details:');
    expect(result.content[0]?.text).toContain('"name":');
    expect(result.content[0]?.text).toContain('"targets":');
    expect(result.content[1]?.text).toContain('Project Dependencies:');
    expect(result.content[2]?.text).toContain('External Dependencies:');
  });

  it('should filter to root path using dot notation', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
      '--tool-arg filter="root"',
    );

    // Should have 1 content block with just the root value
    expect(result.content).toHaveLength(1);
    const text = result.content[0]?.text;
    // For react-standalone preset, root is "."
    expect(text.trim()).toBe('"."');
    // Should not contain other project data
    expect(text).not.toContain('"targets"');
    expect(text).not.toContain('"name"');
  });

  it('should filter to name field', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
      '--tool-arg filter="name"',
    );

    expect(result.content).toHaveLength(1);
    const text = result.content[0]?.text;
    expect(text.trim()).toBe(`"${workspaceName}"`);
  });

  it('should filter to nested targets.build path', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
      '--tool-arg filter="targets.build"',
    );

    expect(result.content).toHaveLength(1);
    const text = result.content[0]?.text;
    // Should contain build target configuration
    expect(text).toContain('"executor"');
    expect(text).toContain('"options"');
    // Should not contain the full targets object with other targets
    expect(text).not.toContain('"targets"');
  });

  it('should filter to deeply nested targets.build.executor path', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
      '--tool-arg filter="targets.build.executor"',
    );

    expect(result.content).toHaveLength(1);
    const text = result.content[0]?.text;
    // Should be just the executor string
    expect(text).toContain('nx:');
    expect(text).not.toContain('"options"');
  });

  it('should filter to tags array', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
      '--tool-arg filter="tags"',
    );

    expect(result.content).toHaveLength(1);
    const text = result.content[0]?.text;
    // Should be an array
    expect(text.trim().startsWith('[')).toBe(true);
    expect(text.trim().endsWith(']')).toBe(true);
  });

  it('should filter to array element using bracket notation tags[0]', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
      '--tool-arg filter="tags[0]"',
    );

    expect(result.content).toHaveLength(1);
    const text = result.content[0]?.text;
    // Should be a single string value (first tag)
    expect(text.trim().startsWith('"')).toBe(true);
    expect(text.trim().endsWith('"')).toBe(true);
  });

  it('should return error for invalid path', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
      '--tool-arg filter="nonexistent.path.to.nowhere"',
    );

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      'Path "nonexistent.path.to.nowhere" not found',
    );
  });

  it('should return error for nonexistent project', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      '--tool-arg projectName="nonexistent-project"',
      '--tool-arg filter="root"',
    );

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      'Project nonexistent-project not found',
    );
  });
});
