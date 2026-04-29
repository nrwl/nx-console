jest.mock('@nx-console/shared-nx-cloud', () => ({
  getNxCloudTerminalOutput: jest.fn(),
  getPipelineExecutionDetails: jest.fn(),
  getRecentCIPEData: jest.fn(),
  getRunDetails: jest.fn(),
  parseNxCloudUrl: jest.fn(),
  retrieveFixDiff: jest.fn(),
  updateSuggestedFix: jest.fn(),
}));

import { CI_TASK_OUTPUT } from '@nx-console/shared-llm-context';
import { getNxCloudTerminalOutput } from '@nx-console/shared-nx-cloud';

import { CIInformationOutput } from './output-schemas';
import {
  __testing__,
  registerNxCloudTools,
  SELF_HEALING_CHUNK_SIZE,
} from './nx-cloud';
import { getValueByPath } from './nx-workspace';

const mockedGetNxCloudTerminalOutput = jest.mocked(getNxCloudTerminalOutput);
const { parseShortLink, formatCIInformationOverview, chunkContentReverse } =
  __testing__;

function createOutput(
  overrides: Partial<CIInformationOutput> = {},
): CIInformationOutput {
  return {
    cipeStatus: 'FAILED',
    cipeUrl: 'https://cloud.nx.app/cipes/123',
    branch: 'feature-branch',
    commitSha: 'abc123',
    failedTasks: [
      {
        taskId: 'app:build',
        runId: 'run-1',
        runUrl: 'https://cloud.nx.app/runs/run-1',
      },
      {
        taskId: 'lib:test',
        runId: 'run-2',
        runUrl: 'https://cloud.nx.app/runs/run-2',
      },
    ],
    verifiedTaskIds: ['app:build'],
    selfHealingEnabled: true,
    selfHealingStatus: 'COMPLETED',
    verificationStatus: 'COMPLETED',
    userAction: 'NONE',
    failureClassification: 'build_error',
    suggestedFixReasoning: 'The variable was undefined',
    suggestedFixDescription: 'Fix the bug',
    suggestedFix: '--- a/file.ts\n+++ b/file.ts\n@@ -1 +1 @@\n-old\n+new',
    shortLink: 'abc-def',
    couldAutoApplyTasks: true,
    autoApplySkipped: null,
    autoApplySkipReason: null,
    confidence: 0.85,
    confidenceReasoning:
      'High confidence because the fix directly addresses the reported error',
    selfHealingSkippedReason: null,
    selfHealingSkipMessage: null,
    error: null,
    ...overrides,
  };
}

describe('parseShortLink', () => {
  it('should parse valid shortlink with two parts', () => {
    expect(parseShortLink('abc123-def456')).toEqual({
      fixShortLink: 'abc123',
      suggestionShortLink: 'def456',
    });
  });

  it('should reject invalid shortlinks', () => {
    expect(parseShortLink('abc123')).toBeNull();
    expect(parseShortLink('')).toBeNull();
    expect(parseShortLink('abc-def-ghi')).toBeNull();
    expect(parseShortLink('abc123-')).toBeNull();
    expect(parseShortLink('-abc123')).toBeNull();
    expect(parseShortLink(undefined as unknown as string)).toBeNull();
    expect(parseShortLink(null as unknown as string)).toBeNull();
    expect(parseShortLink(123 as unknown as string)).toBeNull();
  });
});

describe('formatCIInformationOverview', () => {
  it('should format overview with failed tasks and fix metadata', () => {
    const result = formatCIInformationOverview(createOutput());

    expect(result).toContain('## CI Pipeline Information');
    expect(result).toContain('### Pipeline Status');
    expect(result).toContain('**Status:** FAILED');
    expect(result).toContain('**Branch:** feature-branch');
    expect(result).toContain('**Commit:** abc123');

    expect(result).toContain('### Failed Tasks');
    expect(result).toContain('`failedTasks`');
    expect(result).toContain(
      '- app:build (runId: run-1, url: https://cloud.nx.app/runs/run-1)',
    );
    expect(result).toContain(
      '- lib:test (runId: run-2, url: https://cloud.nx.app/runs/run-2)',
    );

    expect(result).toContain('### Self-Healing');
    expect(result).toContain('**Enabled:** Yes');
    expect(result).toContain('**Status:** COMPLETED');
    expect(result).toContain('**Verification:** COMPLETED');
    expect(result).toContain('**Failure Classification:** build_error');
    expect(result).toContain('**Could Auto-Apply:** Yes');
    expect(result).toContain('**Confidence:** 0.85');
    expect(result).toContain('**Confidence Reasoning:**');

    expect(result).toContain('### Suggested Fix');
    expect(result).toContain('**Description:** Fix the bug');
    expect(result).toContain('**Reasoning:** The variable was undefined');
    expect(result).toContain('#### Diff Preview');
    expect(result).toContain('```diff');
    expect(result).toContain('-old');
    expect(result).toContain('+new');
    expect(result).toContain("select='suggestedFix'");

    expect(result).toContain('### Apply Fix');
    expect(result).toContain('`abc-def`');
  });

  it('should omit optional sections when data is missing', () => {
    const result = formatCIInformationOverview(
      createOutput({
        cipeStatus: 'IN_PROGRESS',
        commitSha: null,
        failedTasks: [],
        suggestedFixReasoning: null,
        suggestedFixDescription: null,
        suggestedFix: null,
        shortLink: null,
      }),
    );

    expect(result).not.toContain('### Failed Tasks');
    expect(result).not.toContain('### Suggested Fix');
    expect(result).not.toContain('### Apply Fix');
    expect(result).not.toContain('**Commit:**');
  });

  it('should hide user action when it is NONE and show skip details', () => {
    const hiddenUserAction = formatCIInformationOverview(
      createOutput({ userAction: 'NONE' }),
    );
    expect(hiddenUserAction).not.toContain('**User Action:**');

    const skipped = formatCIInformationOverview(
      createOutput({
        selfHealingStatus: null,
        verificationStatus: null,
        userAction: null,
        selfHealingSkippedReason: 'THROTTLED',
        selfHealingSkipMessage:
          'Too many unapplied fixes. See https://cloud.nx.app/cipes/abc/self-healing',
      }),
    );
    expect(skipped).toContain('**Skipped:** THROTTLED');
    expect(skipped).toContain(
      '**Skip Message:** Too many unapplied fixes. See https://cloud.nx.app/cipes/abc/self-healing',
    );
  });

  it('should show user action when it is not NONE', () => {
    const result = formatCIInformationOverview(
      createOutput({ userAction: 'APPLIED_LOCALLY' }),
    );

    expect(result).toContain('**User Action:** APPLIED_LOCALLY');
  });

  it('should truncate long diff previews from the beginning', () => {
    const longDiff =
      '--- a/file.ts\n+++ b/file.ts\n' + '+line\n'.repeat(500) + '-lastline';
    const result = formatCIInformationOverview(
      createOutput({
        suggestedFixDescription: 'Fix the bug',
        suggestedFix: longDiff,
      }),
    );

    expect(result).toContain('--- a/file.ts');
    expect(result).toContain('...');
  });
});

describe('chunkContentReverse', () => {
  it('should return entire content when smaller than chunk size', () => {
    expect(chunkContentReverse('Hello World', 0, 1000)).toEqual({
      chunk: 'Hello World',
      hasMore: false,
      totalPages: 1,
    });
  });

  it('should paginate from the end of the content', () => {
    expect(chunkContentReverse('1234567890', 0, 5)).toEqual({
      chunk: '...[older output on page 1]\n67890',
      hasMore: true,
      totalPages: 2,
    });
    expect(chunkContentReverse('1234567890', 1, 5)).toEqual({
      chunk: '12345',
      hasMore: false,
      totalPages: 2,
    });
  });

  it('should handle empty content and pages past the end', () => {
    expect(chunkContentReverse('', 0, 1000)).toEqual({
      chunk: '',
      hasMore: false,
      totalPages: 0,
    });
    expect(chunkContentReverse('short', 10, 5)).toEqual({
      chunk: 'no more content on page 10',
      hasMore: false,
      totalPages: 1,
    });
  });
});

describe('multi-field select parsing', () => {
  it('should parse and retrieve multiple fields', () => {
    const output = createOutput();
    const fields = 'suggestedFix, failedTasks, cipeStatus'
      .split(',')
      .map((s) => s.trim());
    const result: Record<string, unknown> = {};

    for (const field of fields) {
      result[field] = getValueByPath(
        output as unknown as Record<string, unknown>,
        field,
      );
    }

    expect(result).toEqual({
      suggestedFix: '--- a/file.ts\n+++ b/file.ts\n@@ -1 +1 @@\n-old\n+new',
      failedTasks: output.failedTasks,
      cipeStatus: 'FAILED',
    });
  });

  it('should skip non-existent fields', () => {
    const output = createOutput();
    const fields = ['cipeStatus', 'nonExistentField'];
    const result: Record<string, unknown> = {};

    for (const field of fields) {
      if (!(field in output)) {
        continue;
      }
      result[field] = getValueByPath(
        output as unknown as Record<string, unknown>,
        field,
      );
    }

    expect(result).toEqual({
      cipeStatus: 'FAILED',
    });
  });

  it('should truncate long strings in multi-field select from the start', () => {
    const longString = 'A'.repeat(SELF_HEALING_CHUNK_SIZE + 500);
    const output = createOutput({
      suggestedFix: longString,
    });
    const result: Record<string, unknown> = {};

    for (const field of ['cipeStatus', 'suggestedFix']) {
      const value = getValueByPath(
        output as unknown as Record<string, unknown>,
        field,
      );
      if (typeof value === 'string' && value.length > SELF_HEALING_CHUNK_SIZE) {
        result[field] =
          value.slice(0, SELF_HEALING_CHUNK_SIZE) +
          `...\n\n[Truncated - use select="${field}" alone for full paginated content]`;
      } else {
        result[field] = value;
      }
    }

    expect(result['cipeStatus']).toBe('FAILED');
    expect(result['suggestedFix']).toContain('[Truncated');
    expect(result['suggestedFix']).toContain(
      'use select="suggestedFix" alone for full paginated content',
    );
  });
});

describe('registerNxCloudTools', () => {
  it('should register ci_task_output and return paginated output', async () => {
    const terminalOutput = 'A'.repeat(5000) + 'B'.repeat(6000);
    mockedGetNxCloudTerminalOutput.mockResolvedValue({
      terminalOutput,
    });

    const registeredTools = new Map<
      string,
      {
        name: string;
        handler: (args: Record<string, unknown>) => Promise<unknown>;
      }
    >();
    const registry = {
      registerTool: jest.fn((tool) => {
        registeredTools.set(tool.name, tool);
      }),
    };
    const logger = {
      debug: jest.fn(),
      log: jest.fn(),
    };

    registerNxCloudTools(
      '/workspace',
      registry as any,
      logger as any,
      undefined,
    );

    const tool = registeredTools.get(CI_TASK_OUTPUT);
    expect(tool).toBeDefined();
    if (!tool) {
      throw new Error('Expected ci_task_output to be registered');
    }

    const result = (await tool.handler({
      taskId: 'app:build',
      runId: 'run-1',
      pageToken: 0,
    })) as {
      content: Array<{ type: string; text: string }>;
      structuredContent: {
        taskId: string;
        terminalOutput: string | null;
        error: string | null;
        currentPage?: number;
        totalPages?: number;
      };
    };

    expect(mockedGetNxCloudTerminalOutput).toHaveBeenCalledWith(
      { taskId: 'app:build', runId: 'run-1' },
      '/workspace',
      logger,
    );
    expect(result.structuredContent).toEqual({
      taskId: 'app:build',
      terminalOutput: `...[older output on page 1]\n${terminalOutput.slice(-SELF_HEALING_CHUNK_SIZE)}`,
      error: null,
      currentPage: 0,
      totalPages: 2,
    });
    expect(result.content).toEqual([
      {
        type: 'text',
        text: 'Showing page 1 of 2 (most recent output first).',
      },
      {
        type: 'text',
        text: `...[older output on page 1]\n${terminalOutput.slice(-SELF_HEALING_CHUNK_SIZE)}`,
      },
      {
        type: 'text',
        text: 'Next page token: 1. Call this tool again with the next page token to view older output (1 page(s) remaining).',
      },
    ]);
  });
});
