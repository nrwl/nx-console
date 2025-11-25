import {
  cleanupNxWorkspace,
  createInvokeMCPInspectorCLI,
  defaultVersion,
  e2eCwd,
  modifyJsonFile,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
} from '@nx-console/shared-e2e-utils';
import { join } from 'node:path';

function getCompressedTargetsBlock(result: any): string | undefined {
  return result.content.find((block: any) =>
    block.text?.includes('Available Targets (compressed view)'),
  )?.text;
}

function addCustomTargetsToProject(workspacePath: string): void {
  const projectJsonPath = join(workspacePath, 'project.json');
  modifyJsonFile(projectJsonPath, (projectJson) => ({
    ...projectJson,
    targets: {
      ...projectJson.targets,

      'target-nx-executor': {
        executor: '@nx/webpack:webpack',
        options: {
          outputPath: 'dist/apps/test',
        },
      },

      'target-custom-executor': {
        executor: '@my-org/custom:build',
        options: {
          some: 'option',
        },
      },

      'target-run-cmd-options': {
        executor: 'nx:run-commands',
        options: {
          command: 'echo test',
        },
      },

      'target-run-cmd-array-single-str': {
        executor: 'nx:run-commands',
        options: {
          commands: ['npm build'],
        },
      },

      'target-run-cmd-array-single-obj': {
        executor: 'nx:run-commands',
        options: {
          commands: [
            {
              command: 'npm test',
              prefix: 'TEST',
            },
          ],
        },
      },

      'target-run-cmd-array-multi': {
        executor: 'nx:run-commands',
        options: {
          commands: ['cmd1', 'cmd2', 'cmd3'],
        },
      },

      'target-with-deps-string': {
        executor: '@nx/js:tsc',
        options: {},
        dependsOn: ['build', 'test'],
      },

      'target-with-deps-object': {
        executor: '@nx/js:tsc',
        options: {},
        dependsOn: [{ target: 'build' }, { target: '^build' }],
      },

      'target-no-cache': {
        executor: '@nx/js:tsc',
        options: {},
        cache: false,
      },

      'target-with-cache': {
        executor: '@nx/js:tsc',
        options: {},
        cache: true,
      },

      'target-combined': {
        executor: 'nx:run-commands',
        options: {
          command: 'npm test',
        },
        dependsOn: ['build'],
        cache: false,
      },

      // Edge cases
      'target-empty-cmds': {
        executor: 'nx:run-commands',
        options: {
          commands: [],
        },
        cache: true,
      },

      'target-empty-deps': {
        executor: '@nx/js:tsc',
        options: {},
        dependsOn: [],
      },
    },
  }));
}

function addScriptsToPackageJson(workspacePath: string): void {
  const packageJsonPath = join(workspacePath, 'package.json');
  modifyJsonFile(packageJsonPath, (pkg) => ({
    ...pkg,
    scripts: {
      ...pkg.scripts,
      deploy: 'echo "deploying"',
      'custom-hello': "echo 'hello'",
    },
    nx: {
      ...pkg.nx,
      includedScripts: ['deploy', 'custom-hello'],
    },
  }));
}

describe('nx_project_details compressed targets', () => {
  let invokeMCPInspectorCLI: Awaited<
    ReturnType<typeof createInvokeMCPInspectorCLI>
  >;
  const workspaceName = uniq('nx-mcp-compressed-targets');
  const testWorkspacePath = join(e2eCwd, workspaceName);

  beforeAll(async () => {
    newWorkspace({
      name: workspaceName,
      options: simpleReactWorkspaceOptions,
    });

    addCustomTargetsToProject(testWorkspacePath);
    addScriptsToPackageJson(testWorkspacePath);

    invokeMCPInspectorCLI = await createInvokeMCPInspectorCLI(
      e2eCwd,
      workspaceName,
    );
  });

  afterAll(async () => {
    // await cleanupNxWorkspace(testWorkspacePath, defaultVersion);
    // rmSync(testWorkspacePath, { recursive: true, force: true });
  });

  it('should display @nx/* executor correctly', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
    );

    const targetsBlock = getCompressedTargetsBlock(result);
    expect(targetsBlock).toBeDefined();
    expect(targetsBlock).toContain('target-nx-executor: @nx/webpack:webpack');
    // Cache is true by default, so it should NOT be shown (token efficiency)
    expect(targetsBlock).not.toContain(
      'target-nx-executor: @nx/webpack:webpack | cache:',
    );
  });

  it('should display custom executor correctly', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
    );

    const targetsBlock = getCompressedTargetsBlock(result);
    expect(targetsBlock).toBeDefined();
    expect(targetsBlock).toContain(
      'target-custom-executor: @my-org/custom:build',
    );
  });

  it('should display nx:run-commands with options.command correctly', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
    );

    const targetsBlock = getCompressedTargetsBlock(result);
    expect(targetsBlock).toBeDefined();
    expect(targetsBlock).toContain(
      "target-run-cmd-options: nx:run-commands - 'echo test'",
    );
  });

  it('should display nx:run-commands with single string in commands array correctly', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
    );

    const targetsBlock = getCompressedTargetsBlock(result);
    expect(targetsBlock).toBeDefined();
    expect(targetsBlock).toContain(
      "target-run-cmd-array-single-str: nx:run-commands - 'npm build'",
    );
  });

  it('should display nx:run-commands with single object in commands array correctly', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
    );

    const targetsBlock = getCompressedTargetsBlock(result);
    expect(targetsBlock).toBeDefined();
    expect(targetsBlock).toContain(
      "target-run-cmd-array-single-obj: nx:run-commands - 'npm test'",
    );
  });

  it('should display nx:run-commands with multiple commands correctly', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
    );

    const targetsBlock = getCompressedTargetsBlock(result);
    expect(targetsBlock).toBeDefined();
    expect(targetsBlock).toContain(
      'target-run-cmd-array-multi: nx:run-commands - 3 commands',
    );
  });

  it('should display nx:run-script target from package.json script - deploy', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
    );

    const targetsBlock = getCompressedTargetsBlock(result);
    expect(targetsBlock).toBeDefined();
    expect(targetsBlock).toContain("deploy: nx:run-script - 'npm run deploy'");
  });

  it('should display nx:run-script target from package.json script - custom-hello', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
    );

    const targetsBlock = getCompressedTargetsBlock(result);
    expect(targetsBlock).toBeDefined();
    expect(targetsBlock).toContain(
      "custom-hello: nx:run-script - 'npm run custom-hello'",
    );
  });

  it('should display dependsOn with string array correctly', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
    );

    const targetsBlock = getCompressedTargetsBlock(result);
    expect(targetsBlock).toBeDefined();
    expect(targetsBlock).toContain(
      'target-with-deps-string: @nx/js:tsc | depends: [build, test]',
    );
  });

  it('should display dependsOn with object array correctly', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
    );

    const targetsBlock = getCompressedTargetsBlock(result);
    expect(targetsBlock).toBeDefined();
    expect(targetsBlock).toContain(
      'target-with-deps-object: @nx/js:tsc | depends: [build, ^build]',
    );
  });

  it('should display cache disabled correctly', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
    );

    const targetsBlock = getCompressedTargetsBlock(result);
    expect(targetsBlock).toBeDefined();
    expect(targetsBlock).toContain(
      'target-no-cache: @nx/js:tsc | cache: false',
    );
  });

  it('should display cache enabled correctly', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
    );

    const targetsBlock = getCompressedTargetsBlock(result);
    expect(targetsBlock).toBeDefined();
    // When cache is true (default), it should NOT be displayed (token efficiency)
    expect(targetsBlock).toContain('target-with-cache: @nx/js:tsc');
    expect(targetsBlock).not.toContain(
      'target-with-cache: @nx/js:tsc | cache:',
    );
  });

  it('should display combined features correctly', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
    );

    const targetsBlock = getCompressedTargetsBlock(result);
    expect(targetsBlock).toBeDefined();
    expect(targetsBlock).toContain(
      "target-combined: nx:run-commands - 'npm test' | depends: [build] | cache: false",
    );
  });

  it('should include helper text and example in compressed view', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
    );

    const targetsBlock = getCompressedTargetsBlock(result);
    expect(targetsBlock).toBeDefined();
    expect(targetsBlock).toContain('Available Targets (compressed view)');
    expect(targetsBlock).toContain(
      "To see full configuration for a specific target, call this tool again with select='targets.TARGET_NAME'",
    );
    expect(targetsBlock).toMatch(/Example: select='targets\.\w+'/);
  });

  it('should return full unabridged target when using select parameter', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
      '--tool-arg select="targets.target-nx-executor"',
    );

    expect(result.content).toHaveLength(1);
    const text = result.content[0]?.text;

    expect(text).toContain('"executor"');
    expect(text).toContain('"options"');
    expect(text).toContain('@nx/webpack:webpack');
    expect(text).not.toContain('Available Targets (compressed view)');
  });

  it('should handle nx:run-commands with empty commands array', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
    );

    const targetsBlock = getCompressedTargetsBlock(result);
    expect(targetsBlock).toBeDefined();
    expect(targetsBlock).toContain(
      'target-empty-cmds: nx:run-commands - 0 commands',
    );
  });

  it('should not show depends when dependsOn array is empty', () => {
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method tools/call',
      '--tool-name nx_project_details',
      `--tool-arg projectName="${workspaceName}"`,
    );

    const targetsBlock = getCompressedTargetsBlock(result);
    expect(targetsBlock).toBeDefined();
    if (!targetsBlock) return;

    const targetLine = targetsBlock
      .split('\n')
      .find((line: string) => line.includes('target-empty-deps'));
    expect(targetLine).toBeDefined();
    expect(targetLine).not.toContain('depends:');
  });
});
