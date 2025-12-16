import {
  getTokenOptimizedToolResult,
  chunkContent,
  registerNxWorkspaceTools,
  __testing__,
} from './nx-workspace';
import { NxWorkspace, NxError } from '@nx-console/shared-types';
import {
  getNxJsonPrompt,
  getProjectGraphPrompt,
  getProjectGraphErrorsPrompt,
  NX_WORKSPACE,
  NX_PROJECT_DETAILS,
} from '@nx-console/shared-llm-context';

jest.mock('@nx-console/shared-llm-context', () => {
  const actual = jest.requireActual('@nx-console/shared-llm-context');
  return {
    ...actual,
    getNxJsonPrompt: jest.fn(),
    getProjectGraphPrompt: jest.fn(),
    getProjectGraphErrorsPrompt: jest.fn(),
  };
});

// Mock shared-npm module - don't import to avoid lazy-load conflict
jest.mock('@nx-console/shared-npm', () => ({
  checkIsNxWorkspace: jest.fn().mockResolvedValue(true),
  findMatchingProject: jest.fn(),
  findMatchingProjects: jest.fn().mockResolvedValue([]),
  workspaceDependencyPath: jest.fn().mockResolvedValue(null),
}));

// Mock output-schemas to avoid file system operations
jest.mock('./output-schemas', () => ({
  loadNxOutputSchemas: jest.fn().mockResolvedValue({
    nxWorkspaceOutputSchema: { type: 'object' },
    nxProjectDetailsOutputSchema: { type: 'object' },
  }),
}));

const mockGetNxJsonPrompt = getNxJsonPrompt as jest.MockedFunction<
  typeof getNxJsonPrompt
>;
const mockGetProjectGraphPrompt = getProjectGraphPrompt as jest.MockedFunction<
  typeof getProjectGraphPrompt
>;
const mockGetProjectGraphErrorsPrompt =
  getProjectGraphErrorsPrompt as jest.MockedFunction<
    typeof getProjectGraphErrorsPrompt
  >;

describe('getTokenLimitedToolResult', () => {
  const mockWorkspace: NxWorkspace = {
    nxJson: {},
    projectGraph: {
      nodes: {
        app1: {},
      },
      dependencies: {},
    },
    errors: undefined,
    isPartial: false,
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetNxJsonPrompt.mockReturnValue('nx-json-result');
    mockGetProjectGraphPrompt.mockReturnValue('project-graph-result');
    mockGetProjectGraphErrorsPrompt.mockReturnValue('errors-result');
  });

  it('should return results without optimization when under token limit', () => {
    jest.clearAllMocks();
    mockGetNxJsonPrompt.mockReturnValue('small');
    mockGetProjectGraphPrompt.mockReturnValue('small');
    mockGetProjectGraphErrorsPrompt.mockReturnValue('small');

    const result = getTokenOptimizedToolResult(mockWorkspace, 1000);

    expect(result).toEqual(['small', 'small', '']);
    expect(mockGetProjectGraphPrompt).toHaveBeenCalledTimes(1);
    expect(mockGetProjectGraphPrompt).toHaveBeenCalledWith(
      mockWorkspace.projectGraph,
    );
  });

  it('should apply first optimization when over token limit', () => {
    jest.clearAllMocks();
    mockGetNxJsonPrompt.mockReturnValue('short');
    // Use string that will exceed low token limit when divided by 3
    const largeString = 'x'.repeat(200);
    mockGetProjectGraphPrompt
      .mockReturnValueOnce(largeString) // First call - triggers optimization
      .mockReturnValueOnce('short'); // Second call - stops optimization

    // Use a very low token limit to trigger optimization
    const result = getTokenOptimizedToolResult(mockWorkspace, 50);

    expect(mockGetProjectGraphPrompt).toHaveBeenCalledTimes(2);
    expect(mockGetProjectGraphPrompt).toHaveBeenNthCalledWith(
      1,
      mockWorkspace.projectGraph,
    );
    expect(mockGetProjectGraphPrompt).toHaveBeenNthCalledWith(
      2,
      mockWorkspace.projectGraph,
      {
        skipOwners: true,
        skipTechnologies: true,
      },
    );
  });

  it('should apply second optimization when still over token limit', () => {
    jest.clearAllMocks();
    mockGetNxJsonPrompt.mockReturnValue('short');
    const largeString = 'x'.repeat(200);
    mockGetProjectGraphPrompt
      .mockReturnValueOnce(largeString) // First call - triggers optimization
      .mockReturnValueOnce(largeString) // Second call - still large, continues optimization
      .mockReturnValueOnce('short'); // Third call - stops optimization

    const result = getTokenOptimizedToolResult(mockWorkspace, 50);

    expect(mockGetProjectGraphPrompt).toHaveBeenCalledTimes(3);
    expect(mockGetProjectGraphPrompt).toHaveBeenNthCalledWith(
      2,
      mockWorkspace.projectGraph,
      {
        skipOwners: true,
        skipTechnologies: true,
      },
    );
    expect(mockGetProjectGraphPrompt).toHaveBeenNthCalledWith(
      3,
      mockWorkspace.projectGraph,
      {
        skipOwners: true,
        skipTechnologies: true,
        truncateTargets: true,
      },
    );
  });

  it('should apply third optimization when still over token limit', () => {
    jest.clearAllMocks();
    mockGetNxJsonPrompt.mockReturnValue('short');
    const largeString = 'x'.repeat(200);
    mockGetProjectGraphPrompt
      .mockReturnValueOnce(largeString) // First call - triggers optimization
      .mockReturnValueOnce(largeString) // Second call - still large, continues
      .mockReturnValueOnce(largeString) // Third call - still large, continues
      .mockReturnValueOnce('short'); // Fourth call - stops optimization

    const result = getTokenOptimizedToolResult(mockWorkspace, 50);

    expect(mockGetProjectGraphPrompt).toHaveBeenCalledTimes(4);
    expect(mockGetProjectGraphPrompt).toHaveBeenNthCalledWith(
      4,
      mockWorkspace.projectGraph,
      {
        skipOwners: true,
        skipTechnologies: true,
        skipTags: true,
        truncateTargets: true,
      },
    );
  });

  it('should stop optimization after 3 attempts even if still over limit', () => {
    jest.clearAllMocks();
    mockGetNxJsonPrompt.mockReturnValue('short');
    const largeString = 'x'.repeat(200);
    mockGetProjectGraphPrompt
      .mockReturnValueOnce(largeString)
      .mockReturnValueOnce(largeString)
      .mockReturnValueOnce(largeString)
      .mockReturnValueOnce(largeString);

    const result = getTokenOptimizedToolResult(mockWorkspace, 50);

    expect(mockGetProjectGraphPrompt).toHaveBeenCalledTimes(4);
  });

  it('should include errors result when workspace has errors', () => {
    const mockError: NxError = { message: 'Some error' };
    const workspaceWithErrors: NxWorkspace = {
      ...mockWorkspace,
      errors: [mockError],
    };

    jest.clearAllMocks();
    mockGetNxJsonPrompt.mockReturnValue('small');
    mockGetProjectGraphPrompt.mockReturnValue('small');
    mockGetProjectGraphErrorsPrompt.mockReturnValue('error-result');

    const result = getTokenOptimizedToolResult(workspaceWithErrors, 1000);

    expect(mockGetProjectGraphErrorsPrompt).toHaveBeenCalledWith(
      [mockError],
      false,
    );
    expect(result).toEqual(['small', 'small', 'error-result']);
  });

  it('should handle workspace without errors', () => {
    const workspaceWithoutErrors: NxWorkspace = {
      ...mockWorkspace,
      errors: undefined,
    };

    jest.clearAllMocks();
    mockGetNxJsonPrompt.mockReturnValue('small');
    mockGetProjectGraphPrompt.mockReturnValue('small');

    const result = getTokenOptimizedToolResult(workspaceWithoutErrors, 1000);

    expect(mockGetProjectGraphErrorsPrompt).not.toHaveBeenCalled();
    expect(result).toEqual(['small', 'small', '']);
  });
});

describe('chunkContent', () => {
  it('should return first chunk when pageNumber is 0', () => {
    const content = 'abcdefghij';
    const result = chunkContent(content, 0, 5);

    expect(result.chunk).toBe('abcde\n...[truncated, continue on page 1]');
    expect(result.hasMore).toBe(true);
  });

  it('should return second chunk when pageNumber is 1', () => {
    const content = 'abcdefghij';
    const result = chunkContent(content, 1, 5);

    expect(result.chunk).toBe('fghij');
    expect(result.hasMore).toBe(false);
  });

  it('should return empty chunk when pageNumber is beyond content', () => {
    const content = 'abcde';
    const result = chunkContent(content, 2, 5);

    expect(result.chunk).toBe('no more content on page 2');
    expect(result.hasMore).toBe(false);
  });

  it('should return entire content when chunkSize is larger', () => {
    const content = 'abcde';
    const result = chunkContent(content, 0, 100);

    expect(result.chunk).toBe('abcde');
    expect(result.hasMore).toBe(false);
  });

  it('should handle empty content', () => {
    const content = '';
    const result = chunkContent(content, 0, 5);

    expect(result.chunk).toBe('');
    expect(result.hasMore).toBe(false);
  });

  it('should indicate hasMore correctly for exact chunk boundary', () => {
    const content = 'abcdefghij';
    const result = chunkContent(content, 0, 10);

    expect(result.chunk).toBe('abcdefghij');
    expect(result.hasMore).toBe(false);
  });

  it('should indicate hasMore correctly when one char remains', () => {
    const content = 'abcdefghijk';
    const result = chunkContent(content, 0, 10);

    expect(result.chunk).toBe('abcdefghij\n...[truncated, continue on page 1]');
    expect(result.hasMore).toBe(true);
  });

  it('should handle multiple pages correctly', () => {
    const content = 'abcdefghijklmnopqrst';

    const page0 = chunkContent(content, 0, 5);
    expect(page0.chunk).toBe('abcde\n...[truncated, continue on page 1]');
    expect(page0.hasMore).toBe(true);

    const page1 = chunkContent(content, 1, 5);
    expect(page1.chunk).toBe('fghij\n...[truncated, continue on page 2]');
    expect(page1.hasMore).toBe(true);

    const page2 = chunkContent(content, 2, 5);
    expect(page2.chunk).toBe('klmno\n...[truncated, continue on page 3]');
    expect(page2.hasMore).toBe(true);

    const page3 = chunkContent(content, 3, 5);
    expect(page3.chunk).toBe('pqrst');
    expect(page3.hasMore).toBe(false);
  });

  it('should handle null content', () => {
    const result = chunkContent(null as any, 0, 5);

    expect(result.chunk).toBe('');
    expect(result.hasMore).toBe(false);
  });

  it('should handle undefined content', () => {
    const result = chunkContent(undefined as any, 0, 5);

    expect(result.chunk).toBe('');
    expect(result.hasMore).toBe(false);
  });

  it('should show correct page number in no more content message for different pages', () => {
    const content = 'abcde';

    const page5 = chunkContent(content, 5, 5);
    expect(page5.chunk).toBe('no more content on page 5');
    expect(page5.hasMore).toBe(false);

    const page10 = chunkContent(content, 10, 5);
    expect(page10.chunk).toBe('no more content on page 10');
    expect(page10.hasMore).toBe(false);
  });
});

describe('registerNxWorkspaceTools', () => {
  let mockServer: any;
  let mockLogger: any;
  let mockNxWorkspaceInfoProvider: any;
  let registeredTools: Record<string, any> = {};

  const mockWorkspace: NxWorkspace = {
    nxJson: {},
    projectGraph: {
      nodes: {
        app1: {
          name: 'app1',
          type: 'app',
          data: {
            root: 'apps/app1',
            targets: {
              build: {
                executor: 'nx:run-commands',
                options: {
                  command: 'echo build',
                },
              },
            },
            tags: ['type:app'],
          },
        },
        lib1: {
          name: 'lib1',
          type: 'lib',
          data: {
            root: 'libs/lib1',
            targets: {
              test: {
                executor: '@nx/jest:jest',
              },
            },
          },
        },
      },
      dependencies: {
        app1: [{ source: 'app1', target: 'lib1', type: 'static' }],
        lib1: [],
      },
    },
    errors: undefined,
    isPartial: false,
  } as any;

  beforeEach(() => {
    registeredTools = {};
    mockServer = {
      registerTool: jest.fn((tool) => {
        registeredTools[tool.name] = tool.handler;
      }),
    };
    mockLogger = {
      debug: jest.fn(),
    };
    mockNxWorkspaceInfoProvider = {
      nxWorkspace: jest.fn().mockResolvedValue(mockWorkspace),
    };

    // Setup shared-npm mock - access via jest.mocked to avoid import
    const { findMatchingProject } = jest.requireMock('@nx-console/shared-npm');
    findMatchingProject.mockImplementation((name: string) => {
      return mockWorkspace.projectGraph.nodes[name];
    });

    // Set default mock return values
    mockGetNxJsonPrompt.mockReturnValue('nx-json-result');
    mockGetProjectGraphPrompt.mockReturnValue('project-graph-result');
    mockGetProjectGraphErrorsPrompt.mockReturnValue('errors-result');
  });

  it('should register tools', async () => {
    await registerNxWorkspaceTools(
      '/workspace',
      mockServer,
      mockLogger,
      mockNxWorkspaceInfoProvider,
    );

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: NX_WORKSPACE }),
    );
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: NX_PROJECT_DETAILS }),
    );
  });

  describe('nx_workspace tool', () => {
    beforeEach(async () => {
      await registerNxWorkspaceTools(
        '/workspace',
        mockServer,
        mockLogger,
        mockNxWorkspaceInfoProvider,
      );
    });

    it('should return compressed format by default', async () => {
      const handler = registeredTools[NX_WORKSPACE];
      const result = await handler({});

      expect(result.content[0].text).toContain('nx-json-result');
      expect(result.content[0].text).toContain('project-graph-result');
    });

    it('should return JSON when select is provided', async () => {
      const handler = registeredTools[NX_WORKSPACE];
      const result = await handler({ select: 'targets.build' });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(2);
      expect(parsed.find((p: any) => p.projectName === 'app1').value).toEqual({
        executor: 'nx:run-commands',
        options: {
          command: 'echo build',
        },
      });
      expect(
        parsed.find((p: any) => p.projectName === 'lib1').value,
      ).toBeNull();
    });

    it('should handle pagination', async () => {
      const handler = registeredTools[NX_WORKSPACE];
      // Mock a large result by making the prompt return a large string
      mockGetNxJsonPrompt.mockReturnValue('a'.repeat(6000));
      mockGetProjectGraphPrompt.mockReturnValue('b'.repeat(6000));

      const resultPage0 = await handler({});
      expect(resultPage0.content[0].text).toContain('...[truncated');
      expect(resultPage0.content[1].text).toContain('Next page token: 1');

      const resultPage1 = await handler({ pageToken: 1 });
      expect(resultPage1.content[0].text).not.toContain('nx-json-result'); // Should be in the middle of the content
      expect(resultPage1.content[0].text).toHaveLength(2002); // Remaining content
    });
  });

  describe('nx_project_details tool', () => {
    beforeEach(() => {
      registerNxWorkspaceTools(
        '/workspace',
        mockServer,
        mockLogger,
        mockNxWorkspaceInfoProvider,
      );
    });

    it('should return compressed targets by default', async () => {
      const handler = registeredTools[NX_PROJECT_DETAILS];
      const result = await handler({ projectName: 'app1' });

      expect(result.content[0].text).toContain('Project Details');
      expect(result.content[1].text).toContain('Available Targets');
      expect(result.content[1].text).toContain('nx:run-commands');
    });

    it('should return specific path when select is provided', async () => {
      const handler = registeredTools[NX_PROJECT_DETAILS];
      const result = await handler({
        projectName: 'app1',
        select: 'targets.build',
      });

      expect(result.content[0].text).toContain('Project Details');
      // Should contain the full JSON for the target
      expect(result.content[0].text).toContain('"executor": "nx:run-commands"');
      // Should NOT contain the compressed targets view
      expect(result.content.length).toBe(1);
    });

    it('should return error if select path not found', async () => {
      const handler = registeredTools[NX_PROJECT_DETAILS];
      const result = await handler({
        projectName: 'app1',
        select: 'non.existent.path',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'not found in project configuration',
      );
    });
  });
});

describe('compressTargetForDisplay', () => {
  const { compressTargetForDisplay } = __testing__;

  it('should omit cache status when true', () => {
    const config = {
      executor: 'nx:run-commands',
      command: 'echo test',
      cache: true,
    };

    const result = compressTargetForDisplay('build', config);

    expect(result).toBe("build: nx:run-commands - 'echo test'");
    expect(result).not.toContain('cache');
  });

  it('should show cache status when false', () => {
    const config = {
      executor: 'nx:run-commands',
      command: 'echo test',
      cache: false,
    };

    const result = compressTargetForDisplay('build', config);

    expect(result).toBe("build: nx:run-commands - 'echo test' | cache: false");
  });

  it('should truncate long dependency lists', () => {
    const config = {
      executor: '@nx/gradle:gradle',
      dependsOn: [
        'dep1',
        'dep2',
        'dep3',
        'dep4',
        'dep5',
        'dep6',
        'dep7',
        'dep8',
        'dep9',
        'dep10',
        'dep11',
      ],
      cache: true,
    };

    const result = compressTargetForDisplay('build', config);

    expect(result).toBe(
      'build: @nx/gradle:gradle | depends: [dep1, dep2, dep3, +8 more]',
    );
  });

  it('should not truncate short dependency lists', () => {
    const config = {
      executor: '@nx/gradle:gradle',
      dependsOn: ['dep1', 'dep2', 'dep3'],
      cache: true,
    };

    const result = compressTargetForDisplay('build', config);

    expect(result).toBe(
      'build: @nx/gradle:gradle | depends: [dep1, dep2, dep3]',
    );
  });

  it('should show atomized targets with abbreviated names', () => {
    const config = {
      executor: 'nx:noop',
      dependsOn: ['test-ci--Test1', 'test-ci--Test2', 'test-ci--Test3'],
      cache: true,
    };
    const atomizedTargets = [
      'test-ci--Test1',
      'test-ci--Test2',
      'test-ci--Test3',
    ];

    const result = compressTargetForDisplay('test-ci', config, atomizedTargets);

    expect(result).toBe(
      'test-ci: nx:noop | depends: [3 atomized targets] | atomized: [Test1, Test2, Test3]',
    );
  });

  it('should truncate long atomized target lists', () => {
    const config = {
      executor: 'nx:noop',
      cache: true,
    };
    const atomizedTargets = [
      'test-ci--Test1',
      'test-ci--Test2',
      'test-ci--Test3',
      'test-ci--Test4',
      'test-ci--Test5',
      'test-ci--Test6',
    ];

    const result = compressTargetForDisplay('test-ci', config, atomizedTargets);

    expect(result).toBe(
      'test-ci: nx:noop | atomized: [Test1, Test2, Test3, +3 more]',
    );
  });

  it('should handle target without executor', () => {
    const config = {
      cache: true,
    };

    const result = compressTargetForDisplay('build', config);

    expect(result).toBe('build: no executor');
  });

  it('should handle nx:run-commands with multiple commands', () => {
    const config = {
      executor: 'nx:run-commands',
      options: {
        commands: ['echo test1', 'echo test2', 'echo test3'],
      },
      cache: true,
    };

    const result = compressTargetForDisplay('build', config);

    expect(result).toBe('build: nx:run-commands - 3 commands');
  });

  it('should handle nx:run-script executor', () => {
    const config = {
      executor: 'nx:run-script',
      metadata: {
        runCommand: 'npm run test',
      },
      cache: true,
    };

    const result = compressTargetForDisplay('test', config);

    expect(result).toBe("test: nx:run-script - 'npm run test'");
  });
});
