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

describe('nx_project_details select', () => {
  let invokeMCPInspectorCLI: Awaited<
    ReturnType<typeof createInvokeMCPInspectorCLI>
  >;
  const workspaceName = uniq('nx-mcp-project-details-select');
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

  it('should return full project details when no select is provided', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
    );

    // Should have 3 content blocks: Project Details (without targets), Available Targets (compressed), and External Dependencies
    expect(result.content).toHaveLength(3);
    expect(result.content[0]?.text).toContain('Project Details:');
    expect(result.content[0]?.text).toContain('"name":');
    // Targets should NOT be in the JSON anymore
    expect(result.content[0]?.text).not.toContain('"targets":');

    // Second block should be compressed targets
    expect(result.content[1]?.text).toContain(
      'Available Targets (compressed view)',
    );
    expect(result.content[1]?.text).toContain(
      'To see full configuration for a specific target',
    );
    // Cache should only appear when it's false (token efficiency)
    // So we should see "cache: false" somewhere, but not "cache: true"
    expect(result.content[1]?.text).not.toContain('cache: true');

    // Third block should be External Dependencies
    expect(result.content[2]?.text).toContain('External Dependencies:');
  });

  it('should select to root path using dot notation', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
      '--tool-arg select="root"',
    );

    // Should have 1 content block with the selected value
    expect(result.content).toHaveLength(1);
    const text = result.content[0]?.text;
    // Should start with "Project Details: " prefix and contain the root value
    expect(text).toContain('Project Details:');
    expect(text).toContain('"."');
    // Should not contain other project data
    expect(text).not.toContain('"targets"');
    expect(text).not.toContain('"name"');
  });

  it('should select to name field', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
      '--tool-arg select="name"',
    );

    expect(result.content).toHaveLength(1);
    const text = result.content[0]?.text;
    expect(text).toContain('Project Details:');
    expect(text).toContain(`"${workspaceName}"`);
  });

  it('should select to sourceRoot field', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
      '--tool-arg select="sourceRoot"',
    );

    expect(result.content).toHaveLength(1);
    const text = result.content[0]?.text;
    expect(text).toContain('Project Details:');
    // sourceRoot should be a string path
    expect(text).toContain('"');
  });

  it('should select to projectType field', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
      '--tool-arg select="projectType"',
    );

    expect(result.content).toHaveLength(1);
    const text = result.content[0]?.text;
    expect(text).toContain('Project Details:');
    expect(text).toContain('"application"');
  });

  it('should select to tags array', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
      '--tool-arg select="tags"',
    );

    expect(result.content).toHaveLength(1);
    const text = result.content[0]?.text;
    // Should contain the "Project Details:" prefix and the array
    expect(text).toContain('Project Details:');
    expect(text).toContain('[');
    expect(text).toContain(']');
  });

  it('should select to array element using bracket notation tags[0]', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
      '--tool-arg select="tags[0]"',
    );

    expect(result.content).toHaveLength(1);
    const text = result.content[0]?.text;
    // Should contain the "Project Details:" prefix and a single string value (first tag)
    expect(text).toContain('Project Details:');
    expect(text).toContain('"');
  });

  it('should return error for invalid path', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
      '--tool-arg select="nonexistent.path.to.nowhere"',
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
      '--tool-arg select="root"',
    );

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      'Project nonexistent-project not found',
    );
  });
});
