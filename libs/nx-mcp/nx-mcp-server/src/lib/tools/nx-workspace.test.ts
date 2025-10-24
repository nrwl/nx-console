import { getTokenOptimizedToolResult, chunkContent } from './nx-workspace';
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
