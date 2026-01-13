import {
  getRecentCIPEData,
  retrieveFixDiff,
  RetrieveFixDiffResponse,
} from '@nx-console/shared-nx-cloud';
import { chunkContent } from './nx-workspace';

// Mock dependencies
jest.mock('@nx-console/shared-nx-cloud', () => ({
  getRecentCIPEData: jest.fn(),
  retrieveFixDiff: jest.fn(),
}));

const mockRetrieveFixDiff = retrieveFixDiff as jest.MockedFunction<
  typeof retrieveFixDiff
>;

// Import after mocking
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { __testing__, SELF_HEALING_CHUNK_SIZE } from './nx-cloud';

const {
  parseShortLink,
  formatSelfHealingContextMarkdown,
  fetchAndFormatFixContext,
} = __testing__;

describe('parseShortLink', () => {
  it('should parse valid shortlink with two parts', () => {
    const result = parseShortLink('abc123-def456');
    expect(result).toEqual({
      fixShortLink: 'abc123',
      suggestionShortLink: 'def456',
    });
  });

  it('should return null for shortlink with one part', () => {
    expect(parseShortLink('abc123')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parseShortLink('')).toBeNull();
  });

  it('should return null for shortlink with more than two parts', () => {
    expect(parseShortLink('abc-def-ghi')).toBeNull();
  });

  it('should return null for shortlink ending with dash', () => {
    expect(parseShortLink('abc123-')).toBeNull();
  });

  it('should return null for shortlink starting with dash', () => {
    expect(parseShortLink('-abc123')).toBeNull();
  });
});

describe('formatSelfHealingContextMarkdown', () => {
  it('should format complete response with all fields', () => {
    const data: RetrieveFixDiffResponse = {
      branch: 'feature-branch',
      commitSha: 'abc123',
      aiFixId: 'fix-id',
      suggestedFix: '--- a/file.ts\n+++ b/file.ts\n@@ -1 +1 @@\n-old\n+new',
      suggestedFixDescription: 'Fix the bug',
      suggestedFixReasoning: 'The variable was undefined',
      suggestedFixStatus: 'COMPLETED',
      prTitle: 'Fix bug in feature',
      prBody: 'This PR fixes a critical bug',
      taskIds: ['app:build', 'lib:test'],
      taskOutputSummary: 'TypeError: undefined is not a function',
      shortLink: 'abc-def',
    };

    const result = formatSelfHealingContextMarkdown(data);

    expect(result).toContain('## Self-Healing CI Fix Context');
    expect(result).toContain('### Status');
    expect(result).toContain('Fix available');
    expect(result).toContain('### PR Context');
    expect(result).toContain('**Title:** Fix bug in feature');
    expect(result).toContain('**Description:** This PR fixes a critical bug');
    expect(result).toContain('### Failed Tasks');
    expect(result).toContain('app:build, lib:test');
    expect(result).toContain('### Error Summary');
    expect(result).toContain('TypeError: undefined is not a function');
    expect(result).toContain('### Suggested Fix');
    expect(result).toContain('**Description:** Fix the bug');
    expect(result).toContain('**Reasoning:** The variable was undefined');
    expect(result).toContain('### Patch');
    expect(result).toContain('```diff');
    expect(result).toContain('-old');
    expect(result).toContain('+new');
    expect(result).toContain('### How to Apply');
    expect(result).toContain('npx nx-cloud apply-locally abc-def');
    expect(result).toContain('### Git Context');
    expect(result).toContain('**Branch:** feature-branch');
    expect(result).toContain('**Base Commit:** abc123');
  });

  it('should show "Fix is being generated" for IN_PROGRESS status', () => {
    const data: RetrieveFixDiffResponse = {
      branch: null,
      commitSha: null,
      aiFixId: null,
      suggestedFix: null,
      suggestedFixDescription: null,
      suggestedFixReasoning: null,
      suggestedFixStatus: 'IN_PROGRESS',
      prTitle: null,
      prBody: null,
      taskIds: null,
      taskOutputSummary: null,
      shortLink: null,
    };

    const result = formatSelfHealingContextMarkdown(data);
    expect(result).toContain('Fix is being generated');
  });

  it('should show "Fix generation failed" for FAILED status', () => {
    const data: RetrieveFixDiffResponse = {
      branch: null,
      commitSha: null,
      aiFixId: null,
      suggestedFix: null,
      suggestedFixDescription: null,
      suggestedFixReasoning: null,
      suggestedFixStatus: 'FAILED',
      prTitle: null,
      prBody: null,
      taskIds: null,
      taskOutputSummary: null,
      shortLink: null,
    };

    const result = formatSelfHealingContextMarkdown(data);
    expect(result).toContain('Fix generation failed');
  });

  it('should omit sections when data is null', () => {
    const data: RetrieveFixDiffResponse = {
      branch: null,
      commitSha: null,
      aiFixId: null,
      suggestedFix: null,
      suggestedFixDescription: null,
      suggestedFixReasoning: null,
      suggestedFixStatus: 'NOT_STARTED',
      prTitle: null,
      prBody: null,
      taskIds: null,
      taskOutputSummary: null,
      shortLink: null,
    };

    const result = formatSelfHealingContextMarkdown(data);

    expect(result).not.toContain('### PR Context');
    expect(result).not.toContain('### Failed Tasks');
    expect(result).not.toContain('### Error Summary');
    expect(result).not.toContain('### Suggested Fix');
    expect(result).not.toContain('### How to Apply');
    expect(result).not.toContain('### Git Context');
  });
});

describe('fetchAndFormatFixContext', () => {
  const mockLogger = { log: jest.fn(), debug: jest.fn() };
  const workspacePath = '/test/workspace';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error for invalid shortlink format', async () => {
    const result = (await fetchAndFormatFixContext(
      workspacePath,
      mockLogger,
      'invalid',
    )) as CallToolResult & { content: { type: 'text' }[] };

    expect(result.content[0].type).toBe('text');
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid shortlink format');
    expect(mockRetrieveFixDiff).not.toHaveBeenCalled();
  });

  it('should return error when retrieveFixDiff fails', async () => {
    mockRetrieveFixDiff.mockResolvedValue({
      error: { type: 'network', message: 'Connection failed' },
    });

    const result = (await fetchAndFormatFixContext(
      workspacePath,
      mockLogger,
      'abc-def',
    )) as CallToolResult & { content: { type: 'text' }[] };

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to retrieve');
    expect(result.content[0].text).toContain('Connection failed');
  });

  it('should not mark not_found errors as isError', async () => {
    mockRetrieveFixDiff.mockResolvedValue({
      error: { type: 'not_found', message: 'Fix not found' },
    });

    const result = (await fetchAndFormatFixContext(
      workspacePath,
      mockLogger,
      'abc-def',
    )) as CallToolResult & { content: { type: 'text' }[] };

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Fix not found');
  });

  it('should return formatted content and structuredContent on success', async () => {
    const mockData: RetrieveFixDiffResponse = {
      branch: 'main',
      commitSha: 'abc123',
      aiFixId: 'fix-1',
      suggestedFix: '-old\n+new',
      suggestedFixDescription: 'Fix description',
      suggestedFixReasoning: 'Fix reasoning',
      suggestedFixStatus: 'COMPLETED',
      prTitle: 'PR Title',
      prBody: 'PR Body',
      taskIds: ['task1'],
      taskOutputSummary: 'Error summary',
      shortLink: null,
    };

    mockRetrieveFixDiff.mockResolvedValue({ data: mockData });

    const result = (await fetchAndFormatFixContext(
      workspacePath,
      mockLogger,
      'abc-def',
    )) as CallToolResult & { content: { type: 'text' }[] };

    expect(result.isError).toBeUndefined();
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('## Self-Healing CI Fix Context');
    expect(result.content[0].text).toContain('**Title:** PR Title');
    expect(result.content[0].text).toContain('task1');
    expect(result.content[0].text).toContain('Error summary');
    expect(result.content[0].text).toContain('Fix description');
    expect(result.structuredContent).toMatchObject({
      branch: 'main',
      commitSha: 'abc123',
      aiFixId: 'fix-1',
      shortLink: 'abc-def',
    });
  });

  it('should apply pagination with pageToken', async () => {
    const mockData: RetrieveFixDiffResponse = {
      branch: 'main',
      commitSha: 'abc123',
      aiFixId: 'fix-1',
      suggestedFix: 'x'.repeat(20000),
      suggestedFixDescription: 'Fix',
      suggestedFixReasoning: 'Reason',
      suggestedFixStatus: 'COMPLETED',
      prTitle: null,
      prBody: null,
      taskIds: null,
      taskOutputSummary: null,
      shortLink: null,
    };

    mockRetrieveFixDiff.mockResolvedValue({ data: mockData });

    const result = (await fetchAndFormatFixContext(
      workspacePath,
      mockLogger,
      'abc-def',
      0,
    )) as CallToolResult & { content: { type: 'text' }[] };

    expect(result.content).toHaveLength(2);
    expect(result.content[1].type).toBe('text');
    expect(result.content[1].text).toContain('Next page token: 1');
  });

  it('should not show pagination message when hasMore is false', async () => {
    const mockData: RetrieveFixDiffResponse = {
      branch: 'main',
      commitSha: 'abc123',
      aiFixId: 'fix-1',
      suggestedFix: 'small diff',
      suggestedFixDescription: 'Fix',
      suggestedFixReasoning: 'Reason',
      suggestedFixStatus: 'COMPLETED',
      prTitle: null,
      prBody: null,
      taskIds: null,
      taskOutputSummary: null,
      shortLink: null,
    };

    mockRetrieveFixDiff.mockResolvedValue({ data: mockData });

    const result = (await fetchAndFormatFixContext(
      workspacePath,
      mockLogger,
      'abc-def',
    )) as CallToolResult & { content: { type: 'text' }[] };

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).not.toContain('Next page token');
  });
});
