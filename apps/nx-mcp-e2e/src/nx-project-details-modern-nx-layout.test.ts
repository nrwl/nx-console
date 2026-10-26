import {
  cleanupNxWorkspace,
  createInvokeMCPInspectorCLI,
  e2eCwd,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
} from '@nx-console/shared-e2e-utils';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// Nx 22.7+ publishes its internals under `nx/dist/src/**` instead of `nx/src/**`.
// The rest of the e2e suite pins the older default version, so this file exists to
// exercise the newer layout end-to-end.
const nxVersion = '22.7.0';

describe(`nx_project_details - nx ${nxVersion} (dist/src layout)`, () => {
  let invokeMCPInspectorCLI: Awaited<
    ReturnType<typeof createInvokeMCPInspectorCLI>
  >;
  const workspaceName = uniq('nx-mcp-project-details-dist-layout');
  const testWorkspacePath = join(e2eCwd, workspaceName);

  beforeAll(async () => {
    newWorkspace({
      name: workspaceName,
      options: simpleReactWorkspaceOptions,
      version: nxVersion,
    });
    invokeMCPInspectorCLI = await createInvokeMCPInspectorCLI(
      e2eCwd,
      workspaceName,
    );
  });

  afterAll(async () => {
    await cleanupNxWorkspace(testWorkspacePath, nxVersion);
    rmSync(testWorkspacePath, { recursive: true, force: true });
  });

  it('should install an nx version that uses the dist/src layout', () => {
    const nxPackagePath = join(testWorkspacePath, 'node_modules', 'nx');
    expect(
      existsSync(
        join(
          nxPackagePath,
          'dist',
          'src',
          'utils',
          'find-matching-projects.js',
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(nxPackagePath, 'src', 'utils', 'find-matching-projects.js'),
      ),
    ).toBe(false);
  });

  it('should return project details rather than a module resolution error', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
    );

    expect(result.isError).toBeFalsy();
    expect(JSON.stringify(result.content)).not.toContain('Cannot find module');
    expect(result.content[0]?.text).toContain('Project Details:');
    expect(result.content[0]?.text).toContain('"name":');
  });

  it('should resolve a project through the select path', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
      '--tool-arg select="name"',
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0]?.text).toContain(`"${workspaceName}"`);
  });
});
