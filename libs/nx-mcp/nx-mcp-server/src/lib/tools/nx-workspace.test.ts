import { getTokenLimitedToolResult } from './nx-workspace';
import { NxWorkspace, NxError } from '@nx-console/shared-types';
import {
  getNxJsonPrompt,
  getProjectGraphPrompt,
  getProjectGraphErrorsPrompt,
} from '@nx-console/shared-llm-context';

jest.mock('@nx-console/shared-llm-context', () => ({
  getNxJsonPrompt: jest.fn(),
  getProjectGraphPrompt: jest.fn(),
  getProjectGraphErrorsPrompt: jest.fn(),
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

    const result = getTokenLimitedToolResult(mockWorkspace, 1000);

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
    const result = getTokenLimitedToolResult(mockWorkspace, 50);

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

    const result = getTokenLimitedToolResult(mockWorkspace, 50);

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

    const result = getTokenLimitedToolResult(mockWorkspace, 50);

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

    const result = getTokenLimitedToolResult(mockWorkspace, 50);

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

    const result = getTokenLimitedToolResult(workspaceWithErrors, 1000);

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

    const result = getTokenLimitedToolResult(workspaceWithoutErrors, 1000);

    expect(mockGetProjectGraphErrorsPrompt).not.toHaveBeenCalled();
    expect(result).toEqual(['small', 'small', '']);
  });
});
