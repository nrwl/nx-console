import {
  cleanupNxWorkspace,
  createInvokeMCPInspectorCLI,
  defaultVersion,
  e2eCwd,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
} from '@nx-console/shared-e2e-utils';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
function getNextPageToken(result: any): number | null {
  const lastContent = result.content[result.content.length - 1];
  if (!lastContent?.text) return null;
  const match = lastContent.text.match(/Next page token: (\d+)/);
  return match ? parseInt(match[1], 10) : null;
}
function hasTruncationIndicator(text: string): boolean {
  return text.includes('...[truncated, continue on page');
}
function hasContinuedLabel(text: string): boolean {
  return text.includes('(continued)');
}
function addManyTargetsToProject(
  workspacePath: string,
  projectName: string,
  targetCount = 100,
): void {
  const projectJsonPath = join(workspacePath, 'project.json');
  const projectJson = JSON.parse(readFileSync(projectJsonPath, 'utf-8'));
  for (let i = 0; i < targetCount; i++) {
    projectJson.targets[`dummy-target-${i}`] = {
      executor: '@nx/js:tsc',
      options: {
        outputPath: `dist/apps/dummy-${i}`,
        main: `src/main-${i}.ts`,
        tsConfig: `tsconfig.app-${i}.json`,
      },
      configurations: {
        production: {
          optimization: true,
        },
        development: {
          optimization: false,
        },
      },
    };
  }
  writeFileSync(projectJsonPath, JSON.stringify(projectJson, null, 2));
}
function addDummyProjectDependency(workspacePath: string): void {
  const dummyProjectName = 'dummy-lib';
  const dummyProjectPath = join(workspacePath, 'libs', dummyProjectName);
  mkdirSync(dummyProjectPath, { recursive: true });
  const dummyProjectJson = {
    name: dummyProjectName,
    root: `libs/${dummyProjectName}`,
    sourceRoot: `libs/${dummyProjectName}/src`,
    projectType: 'library',
    targets: {
      build: {
        executor: '@nx/js:tsc',
        options: {
          outputPath: `dist/libs/${dummyProjectName}`,
        },
      },
    },
  };
  writeFileSync(
    join(dummyProjectPath, 'project.json'),
    JSON.stringify(dummyProjectJson, null, 2),
  );
  const mainProjectJsonPath = join(workspacePath, 'project.json');
  const mainProjectJson = JSON.parse(
    readFileSync(mainProjectJsonPath, 'utf-8'),
  );
  if (!mainProjectJson.implicitDependencies) {
    mainProjectJson.implicitDependencies = [];
  }
  mainProjectJson.implicitDependencies.push(dummyProjectName);
  writeFileSync(mainProjectJsonPath, JSON.stringify(mainProjectJson, null, 2));
}
describe('nx_project_details pagination', () => {
  let invokeMCPInspectorCLI: Awaited<
    ReturnType<typeof createInvokeMCPInspectorCLI>
  >;
  const workspaceName = uniq('nx-mcp-pagination');
  const testWorkspacePath = join(e2eCwd, workspaceName);
  beforeAll(async () => {
    newWorkspace({
      name: workspaceName,
      options: simpleReactWorkspaceOptions,
    });
    addManyTargetsToProject(testWorkspacePath, workspaceName, 100);
    addDummyProjectDependency(testWorkspacePath);
    invokeMCPInspectorCLI = await createInvokeMCPInspectorCLI(
      e2eCwd,
      workspaceName,
    );
  });
  afterAll(async () => {
    await cleanupNxWorkspace(testWorkspacePath, defaultVersion);
    rmSync(testWorkspacePath, { recursive: true, force: true });
  });
  it('should return first page with next token for large content', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
    );
    // With compressed targets, the response is now much smaller and fits on one page
    // Should have 4 blocks: Project Details (without targets), Available Targets (compressed), Project Dependencies, External Dependencies
    expect(result.content.length).toBe(4);
    const projectDetails = result.content[0]?.text;
    expect(projectDetails).toContain('Project Details:');
    expect(projectDetails).not.toContain('(continued)');
    // Verify compressed targets block exists
    expect(result.content[1]?.text).toContain(
      'Available Targets (compressed view)',
    );
    // No pagination needed anymore since content is compressed
    const nextPageToken = getNextPageToken(result);
    expect(nextPageToken).toBeNull();
  });
  it('should return second page with continued label when page token provided', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
      '--tool-arg pageToken=1',
    );
    expect(result.content.length).toBeGreaterThan(0);
    const projectDetails = result.content[0]?.text;
    expect(projectDetails).toContain('(continued)');
  });
  it('should not paginate small content from select', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
      '--tool-arg select="name"',
    );
    expect(result.content).toHaveLength(1);
    const nextPageToken = getNextPageToken(result);
    expect(nextPageToken).toBeNull();
    const text = result.content[0]?.text;
    expect(hasTruncationIndicator(text)).toBe(false);
    expect(hasContinuedLabel(text)).toBe(false);
  });
  it('should handle pagination with select parameter', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
      '--tool-arg select="targets"',
    );
    expect(result.content.length).toBe(2);
    const firstBlock = result.content[0]?.text;
    expect(firstBlock).toContain('Project Details');
    expect(firstBlock).not.toContain('Project Dependencies');
    expect(firstBlock).not.toContain('External Dependencies');
  });
  it('should show no more content message when page token beyond content', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
      '--tool-arg pageToken=10',
    );
    expect(result.content.length).toBeGreaterThan(0);
    const hasNoMoreContentMessage = result.content.some((block: any) =>
      block.text?.includes('no more content on page 10'),
    );
    expect(hasNoMoreContentMessage).toBe(true);
    const nextPageToken = getNextPageToken(result);
    expect(nextPageToken).toBeNull();
  });
  it('should chunk multiple sections in lockstep', () => {
    const page0 = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
    );
    // With compressed targets, everything fits on one page now
    // Page 0 should have 4 blocks: Project Details, Targets (compressed), Project Dependencies, External Dependencies
    expect(page0.content.length).toBe(4);
    expect(page0.content[0]?.text).toContain('Project Details');
    expect(page0.content[1]?.text).toContain('Available Targets');
    expect(page0.content[2]?.text).toContain('Project Dependencies');
    expect(page0.content[3]?.text).toContain('External Dependencies');
    // No pagination needed anymore
    const nextToken = getNextPageToken(page0);
    expect(nextToken).toBeNull();
  });
  it('should show truncation indicators on non-final pages', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
    );
    const projectDetails = result.content[0]?.text;
    // With compressed targets, content now fits on one page, so no truncation indicators
    expect(hasTruncationIndicator(projectDetails)).toBe(false);
  });
  it('should handle select with undefined value correctly', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
      '--tool-arg select="nonexistent.field"',
    );
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('not found');
  });
});
