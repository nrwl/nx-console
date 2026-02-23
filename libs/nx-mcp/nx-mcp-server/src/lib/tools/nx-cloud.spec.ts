import { CIInformationOutput } from './output-schemas';
import { __testing__, SELF_HEALING_CHUNK_SIZE } from './nx-cloud';
import { getValueByPath } from './nx-workspace';

const { parseShortLink, formatCIInformationOverview, chunkContentReverse } =
  __testing__;

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

  it('should return null for undefined input', () => {
    expect(parseShortLink(undefined as unknown as string)).toBeNull();
  });

  it('should return null for null input', () => {
    expect(parseShortLink(null as unknown as string)).toBeNull();
  });

  it('should return null for non-string input', () => {
    expect(parseShortLink(123 as unknown as string)).toBeNull();
  });
});

describe('formatCIInformationOverview', () => {
  it('should format overview with all fields (new API with remote/local)', () => {
    const output: CIInformationOutput = {
      cipeStatus: 'FAILED',
      cipeUrl: 'https://cloud.nx.app/cipes/123',
      branch: 'feature-branch',
      commitSha: 'abc123',
      failedTaskIds: ['app:build', 'lib:test'],
      verifiedTaskIds: ['app:build'],
      selfHealingEnabled: true,
      selfHealingStatus: 'COMPLETED',
      verificationStatus: 'COMPLETED',
      userAction: 'NONE',
      failureClassification: 'build_error',
      taskOutputSummary: null,
      remoteTaskSummary: 'TypeError: undefined is not a function (remote)',
      localTaskSummary: 'Local build output here',
      suggestedFixReasoning: 'The variable was undefined',
      suggestedFixDescription: 'Fix the bug',
      suggestedFix: '--- a/file.ts\n+++ b/file.ts\n@@ -1 +1 @@\n-old\n+new',
      shortLink: 'abc-def',
      couldAutoApplyTasks: true,
      confidence: 0.85,
      confidenceReasoning:
        'High confidence because the fix directly addresses the reported error',
      selfHealingSkippedReason: null,
      selfHealingSkipMessage: null,
      error: null,
    };

    const result = formatCIInformationOverview(output);

    // Overview includes select hint
    expect(result).toContain('## CI Pipeline Information');
    expect(result).toContain('`select` parameter');

    // Overview includes pipeline status with property names in heading
    expect(result).toContain('### Pipeline Status');
    expect(result).toContain('`cipeStatus`');
    expect(result).toContain('**Status:** FAILED');
    expect(result).toContain('**Branch:** feature-branch');
    expect(result).toContain('**URL:** https://cloud.nx.app/cipes/123');
    expect(result).toContain('**Commit:** abc123');

    // Overview includes failed tasks with property name
    expect(result).toContain('### Failed Tasks');
    expect(result).toContain('`failedTaskIds`');
    expect(result).toContain('app:build, lib:test');

    // Overview includes self-healing info with property names
    expect(result).toContain('### Self-Healing');
    expect(result).toContain('`selfHealingEnabled`');
    expect(result).toContain('**Enabled:** Yes');
    expect(result).toContain('**Status:** COMPLETED');
    expect(result).toContain('**Verification:** COMPLETED');
    expect(result).toContain('**Failure Classification:** build_error');
    expect(result).toContain('**Could Auto-Apply:** Yes');
    expect(result).toContain('**Confidence:** 0.85');
    expect(result).toContain(
      '**Confidence Reasoning:** High confidence because the fix directly addresses the reported error',
    );

    // Overview includes truncated task output (shown from the end)
    expect(result).toContain('### Task Output');
    expect(result).toContain(
      '**Task Summary (`remoteTaskSummary`) - tasks ran on other machines:**',
    );
    expect(result).toContain('TypeError: undefined is not a function (remote)');
    expect(result).toContain(
      '**Task Output (`localTaskSummary`) - tasks ran on self-healing agent machine:**',
    );
    expect(result).toContain('Local build output here');
    expect(result).toContain("select='remoteTaskSummary'");

    // Overview includes fix description and truncated diff preview
    expect(result).toContain('### Suggested Fix');
    expect(result).toContain('`suggestedFixDescription`');
    expect(result).toContain('**Description:** Fix the bug');
    expect(result).toContain('**Reasoning:** The variable was undefined');
    expect(result).toContain('#### Diff Preview');
    expect(result).toContain('```diff');
    expect(result).toContain('-old');
    expect(result).toContain('+new');
    expect(result).toContain("select='suggestedFix'");

    // Overview includes shortlink for apply tool
    expect(result).toContain('### Apply Fix');
    expect(result).toContain('`shortLink`');
    expect(result).toContain('`abc-def`');
  });

  it('should show legacy task_output when only taskOutputSummary is populated (old API)', () => {
    const output: CIInformationOutput = {
      cipeStatus: 'FAILED',
      cipeUrl: 'https://cloud.nx.app/cipes/123',
      branch: 'feature-branch',
      commitSha: 'abc123',
      failedTaskIds: ['app:build'],
      verifiedTaskIds: ['app:build'],
      selfHealingEnabled: true,
      selfHealingStatus: 'COMPLETED',
      verificationStatus: 'COMPLETED',
      userAction: 'NONE',
      failureClassification: 'build_error',
      taskOutputSummary: 'TypeError: undefined is not a function',
      remoteTaskSummary: null,
      localTaskSummary: null,
      suggestedFixReasoning: 'The variable was undefined',
      suggestedFixDescription: 'Fix the bug',
      suggestedFix: '--- a/file.ts\n+++ b/file.ts\n@@ -1 +1 @@\n-old\n+new',
      shortLink: 'abc-def',
      couldAutoApplyTasks: true,
      confidence: 0.85,
      confidenceReasoning: null,
      selfHealingSkippedReason: null,
      selfHealingSkipMessage: null,
      error: null,
    };

    const result = formatCIInformationOverview(output);

    // Shows truncated task output from legacy field
    expect(result).toContain('### Task Output');
    expect(result).toContain('**Output:**');
    expect(result).toContain('TypeError: undefined is not a function');
    // New labels should NOT appear since remote/local are null
    expect(result).not.toContain(
      '**Task Summary (`remoteTaskSummary`) - tasks ran on other machines:**',
    );
    expect(result).not.toContain(
      '**Task Output (`localTaskSummary`) - tasks ran on self-healing agent machine:**',
    );
  });

  it('should show self-healing disabled when not enabled', () => {
    const output: CIInformationOutput = {
      cipeStatus: 'SUCCEEDED',
      cipeUrl: 'https://cloud.nx.app/cipes/123',
      branch: 'main',
      commitSha: null,
      failedTaskIds: [],
      verifiedTaskIds: [],
      selfHealingEnabled: false,
      selfHealingStatus: null,
      verificationStatus: null,
      userAction: null,
      failureClassification: null,
      taskOutputSummary: null,
      remoteTaskSummary: null,
      localTaskSummary: null,
      suggestedFixReasoning: null,
      suggestedFixDescription: null,
      suggestedFix: null,
      shortLink: null,
      couldAutoApplyTasks: null,
      confidence: null,
      confidenceReasoning: null,
      selfHealingSkippedReason: null,
      selfHealingSkipMessage: null,
      error: null,
    };

    const result = formatCIInformationOverview(output);
    expect(result).toContain('**Enabled:** No');
    expect(result).not.toContain('**Status:** COMPLETED');
    expect(result).not.toContain('**Confidence:**');
  });

  it('should omit optional sections when data is null', () => {
    const output: CIInformationOutput = {
      cipeStatus: 'IN_PROGRESS',
      cipeUrl: 'https://cloud.nx.app/cipes/123',
      branch: 'main',
      commitSha: null,
      failedTaskIds: [],
      verifiedTaskIds: [],
      selfHealingEnabled: true,
      selfHealingStatus: null,
      verificationStatus: null,
      userAction: null,
      failureClassification: null,
      taskOutputSummary: null,
      remoteTaskSummary: null,
      localTaskSummary: null,
      suggestedFixReasoning: null,
      suggestedFixDescription: null,
      suggestedFix: null,
      shortLink: null,
      couldAutoApplyTasks: null,
      confidence: null,
      confidenceReasoning: null,
      selfHealingSkippedReason: null,
      selfHealingSkipMessage: null,
      error: null,
    };

    const result = formatCIInformationOverview(output);

    expect(result).not.toContain('### Failed Tasks');
    expect(result).not.toContain('### Suggested Fix');
    expect(result).not.toContain('### Task Output');
    expect(result).not.toContain('### Apply Fix');
    expect(result).not.toContain('**Commit:**');
  });

  it('should not show user action when it is NONE', () => {
    const output: CIInformationOutput = {
      cipeStatus: 'FAILED',
      cipeUrl: 'https://cloud.nx.app/cipes/123',
      branch: 'main',
      commitSha: null,
      failedTaskIds: ['app:build'],
      verifiedTaskIds: [],
      selfHealingEnabled: true,
      selfHealingStatus: 'COMPLETED',
      verificationStatus: null,
      userAction: 'NONE',
      failureClassification: null,
      taskOutputSummary: null,
      remoteTaskSummary: null,
      localTaskSummary: null,
      suggestedFixReasoning: null,
      suggestedFixDescription: null,
      suggestedFix: null,
      shortLink: null,
      couldAutoApplyTasks: null,
      confidence: null,
      confidenceReasoning: null,
      selfHealingSkippedReason: null,
      selfHealingSkipMessage: null,
      error: null,
    };

    const result = formatCIInformationOverview(output);
    expect(result).not.toContain('**User Action:**');
  });

  it('should show skipped reason and message when self-healing is throttled', () => {
    const output: CIInformationOutput = {
      cipeStatus: 'FAILED',
      cipeUrl: 'https://cloud.nx.app/cipes/123',
      branch: 'main',
      commitSha: null,
      failedTaskIds: ['app:build'],
      verifiedTaskIds: [],
      selfHealingEnabled: true,
      selfHealingStatus: null,
      verificationStatus: null,
      userAction: null,
      failureClassification: null,
      taskOutputSummary: null,
      remoteTaskSummary: null,
      localTaskSummary: null,
      suggestedFixReasoning: null,
      suggestedFixDescription: null,
      suggestedFix: null,
      shortLink: null,
      couldAutoApplyTasks: null,
      confidence: null,
      confidenceReasoning: null,
      selfHealingSkippedReason: 'THROTTLED',
      selfHealingSkipMessage:
        'Too many unapplied fixes. See https://cloud.nx.app/cipes/abc/self-healing',
      error: null,
    };

    const result = formatCIInformationOverview(output);
    expect(result).toContain('**Skipped:** THROTTLED');
    expect(result).toContain(
      '**Skip Message:** Too many unapplied fixes. See https://cloud.nx.app/cipes/abc/self-healing',
    );
  });

  it('should show user action when it is not NONE', () => {
    const output: CIInformationOutput = {
      cipeStatus: 'FAILED',
      cipeUrl: 'https://cloud.nx.app/cipes/123',
      branch: 'main',
      commitSha: null,
      failedTaskIds: ['app:build'],
      verifiedTaskIds: [],
      selfHealingEnabled: true,
      selfHealingStatus: 'COMPLETED',
      verificationStatus: null,
      userAction: 'APPLIED_LOCALLY',
      failureClassification: null,
      taskOutputSummary: null,
      remoteTaskSummary: null,
      localTaskSummary: null,
      suggestedFixReasoning: null,
      suggestedFixDescription: null,
      suggestedFix: null,
      shortLink: null,
      couldAutoApplyTasks: null,
      confidence: null,
      confidenceReasoning: null,
      selfHealingSkippedReason: null,
      selfHealingSkipMessage: null,
      error: null,
    };

    const result = formatCIInformationOverview(output);
    expect(result).toContain('**User Action:** APPLIED_LOCALLY');
  });

  it('should show only remote task output when only remote is available', () => {
    const output: CIInformationOutput = {
      cipeStatus: 'FAILED',
      cipeUrl: 'https://cloud.nx.app/cipes/123',
      branch: 'main',
      commitSha: null,
      failedTaskIds: ['app:build'],
      verifiedTaskIds: [],
      selfHealingEnabled: true,
      selfHealingStatus: 'COMPLETED',
      verificationStatus: null,
      userAction: 'NONE',
      failureClassification: null,
      taskOutputSummary: null,
      remoteTaskSummary: 'Remote output here',
      localTaskSummary: null,
      suggestedFixReasoning: null,
      suggestedFixDescription: null,
      suggestedFix: null,
      shortLink: null,
      couldAutoApplyTasks: null,
      confidence: null,
      confidenceReasoning: null,
      selfHealingSkippedReason: null,
      selfHealingSkipMessage: null,
      error: null,
    };

    const result = formatCIInformationOverview(output);
    expect(result).toContain('### Task Output');
    expect(result).toContain(
      '**Task Summary (`remoteTaskSummary`) - tasks ran on other machines:**',
    );
    expect(result).toContain('Remote output here');
    expect(result).not.toContain(
      '**Task Output (`localTaskSummary`) - tasks ran on self-healing agent machine:**',
    );
    expect(result).not.toContain('**Output:**');
  });

  it('should show only local task output when only local is available', () => {
    const output: CIInformationOutput = {
      cipeStatus: 'FAILED',
      cipeUrl: 'https://cloud.nx.app/cipes/123',
      branch: 'main',
      commitSha: null,
      failedTaskIds: ['app:build'],
      verifiedTaskIds: [],
      selfHealingEnabled: true,
      selfHealingStatus: 'COMPLETED',
      verificationStatus: null,
      userAction: 'NONE',
      failureClassification: null,
      taskOutputSummary: null,
      remoteTaskSummary: null,
      localTaskSummary: 'Local output here',
      suggestedFixReasoning: null,
      suggestedFixDescription: null,
      suggestedFix: null,
      shortLink: null,
      couldAutoApplyTasks: null,
      confidence: null,
      confidenceReasoning: null,
      selfHealingSkippedReason: null,
      selfHealingSkipMessage: null,
      error: null,
    };

    const result = formatCIInformationOverview(output);
    expect(result).toContain('### Task Output');
    expect(result).not.toContain(
      '**Task Summary (`remoteTaskSummary`) - tasks ran on other machines:**',
    );
    expect(result).toContain(
      '**Task Output (`localTaskSummary`) - tasks ran on self-healing agent machine:**',
    );
    expect(result).toContain('Local output here');
    expect(result).not.toContain('**Output:**');
  });

  it('should truncate long task output from the end', () => {
    // Create string longer than TRUNCATION_LENGTH (1000)
    // A's at start should be truncated, B's at end should be kept
    // Last 1000 chars must not include any A's, so B section needs to be > 1000
    const longOutput = 'A'.repeat(500) + 'B'.repeat(1200);
    const output: CIInformationOutput = {
      cipeStatus: 'FAILED',
      cipeUrl: 'https://cloud.nx.app/cipes/123',
      branch: 'main',
      commitSha: null,
      failedTaskIds: ['app:build'],
      verifiedTaskIds: [],
      selfHealingEnabled: true,
      selfHealingStatus: 'COMPLETED',
      verificationStatus: null,
      userAction: 'NONE',
      failureClassification: null,
      taskOutputSummary: null,
      remoteTaskSummary: longOutput,
      localTaskSummary: null,
      suggestedFixReasoning: null,
      suggestedFixDescription: null,
      suggestedFix: null,
      shortLink: null,
      couldAutoApplyTasks: null,
      confidence: null,
      confidenceReasoning: null,
      selfHealingSkippedReason: null,
      selfHealingSkipMessage: null,
      error: null,
    };

    const result = formatCIInformationOverview(output);
    // Should show end of output (B's), not beginning (A's)
    expect(result).toContain('BBBBB');
    expect(result).not.toContain('AAAAA');
    // Should have truncation indicator at the beginning
    expect(result).toContain('...');
  });

  it('should truncate long diff from the beginning', () => {
    const longDiff =
      '--- a/file.ts\n+++ b/file.ts\n' + '+line\n'.repeat(500) + '-lastline';
    const output: CIInformationOutput = {
      cipeStatus: 'FAILED',
      cipeUrl: 'https://cloud.nx.app/cipes/123',
      branch: 'main',
      commitSha: null,
      failedTaskIds: ['app:build'],
      verifiedTaskIds: [],
      selfHealingEnabled: true,
      selfHealingStatus: 'COMPLETED',
      verificationStatus: null,
      userAction: 'NONE',
      failureClassification: null,
      taskOutputSummary: null,
      remoteTaskSummary: null,
      localTaskSummary: null,
      suggestedFixReasoning: null,
      suggestedFixDescription: 'Fix the bug',
      suggestedFix: longDiff,
      shortLink: null,
      couldAutoApplyTasks: null,
      confidence: null,
      confidenceReasoning: null,
      selfHealingSkippedReason: null,
      selfHealingSkipMessage: null,
      error: null,
    };

    const result = formatCIInformationOverview(output);
    // Diff is truncated from the beginning (shows start of diff)
    expect(result).toContain('--- a/file.ts');
    // Should have truncation indicator at the end
    expect(result).toContain('...');
  });
});

describe('chunkContentReverse', () => {
  it('should return entire content when smaller than chunk size', () => {
    const content = 'Hello World';
    const result = chunkContentReverse(content, 0, 1000);
    expect(result.chunk).toBe('Hello World');
    expect(result.hasMore).toBe(false);
  });

  it('should return empty string for empty content', () => {
    const result = chunkContentReverse('', 0, 1000);
    expect(result.chunk).toBe('');
    expect(result.hasMore).toBe(false);
  });

  it('should return end of content on page 0', () => {
    const content = '1234567890';
    const result = chunkContentReverse(content, 0, 5);
    expect(result.chunk).toContain('67890');
    expect(result.hasMore).toBe(true);
  });

  it('should return earlier content on page 1', () => {
    const content = '1234567890';
    const result = chunkContentReverse(content, 1, 5);
    expect(result.chunk).toContain('12345');
    expect(result.hasMore).toBe(false);
  });

  it('should add hint about older output when more content exists', () => {
    const content = '1234567890';
    const result = chunkContentReverse(content, 0, 5);
    expect(result.chunk).toContain('...[older output on page 1]');
  });

  it('should handle page beyond content', () => {
    const content = 'short';
    const result = chunkContentReverse(content, 10, 5);
    expect(result.chunk).toContain('no more content');
    expect(result.hasMore).toBe(false);
  });
});

describe('multi-field select parsing', () => {
  it('should parse single field correctly', () => {
    const select = 'suggestedFix';
    const fields = select.split(',').map((s) => s.trim());
    expect(fields).toEqual(['suggestedFix']);
    expect(fields.length).toBe(1);
  });

  it('should parse multiple comma-separated fields', () => {
    const select = 'suggestedFix,localTaskSummary';
    const fields = select.split(',').map((s) => s.trim());
    expect(fields).toEqual(['suggestedFix', 'localTaskSummary']);
    expect(fields.length).toBe(2);
  });

  it('should trim whitespace from field names', () => {
    const select = ' suggestedFix , localTaskSummary , remoteTaskSummary ';
    const fields = select.split(',').map((s) => s.trim());
    expect(fields).toEqual([
      'suggestedFix',
      'localTaskSummary',
      'remoteTaskSummary',
    ]);
  });

  it('should handle multiple fields with getValueByPath', () => {
    const output: CIInformationOutput = {
      cipeStatus: 'FAILED',
      cipeUrl: 'https://cloud.nx.app/cipes/123',
      branch: 'feature-branch',
      commitSha: 'abc123',
      failedTaskIds: ['app:build', 'lib:test'],
      verifiedTaskIds: ['app:build'],
      selfHealingEnabled: true,
      selfHealingStatus: 'COMPLETED',
      verificationStatus: 'COMPLETED',
      userAction: 'NONE',
      failureClassification: 'build_error',
      taskOutputSummary: null,
      remoteTaskSummary: 'Remote task output',
      localTaskSummary: 'Local task output',
      suggestedFixReasoning: 'Reasoning here',
      suggestedFixDescription: 'Fix description',
      suggestedFix: '--- a/file.ts\n+++ b/file.ts',
      shortLink: 'abc-def',
      couldAutoApplyTasks: true,
      confidence: 0.85,
      confidenceReasoning: null,
      selfHealingSkippedReason: null,
      selfHealingSkipMessage: null,
      error: null,
    };

    const fields = ['suggestedFix', 'localTaskSummary', 'cipeStatus'];
    const result: Record<string, unknown> = {};

    for (const field of fields) {
      result[field] = getValueByPath(
        output as unknown as Record<string, unknown>,
        field,
      );
    }

    expect(result).toEqual({
      suggestedFix: '--- a/file.ts\n+++ b/file.ts',
      localTaskSummary: 'Local task output',
      cipeStatus: 'FAILED',
    });
  });

  it('should skip non-existent fields in multi-field select', () => {
    const output: CIInformationOutput = {
      cipeStatus: 'FAILED',
      cipeUrl: 'https://cloud.nx.app/cipes/123',
      branch: 'feature-branch',
      commitSha: null,
      failedTaskIds: [],
      verifiedTaskIds: [],
      selfHealingEnabled: false,
      selfHealingStatus: null,
      verificationStatus: null,
      userAction: null,
      failureClassification: null,
      taskOutputSummary: null,
      remoteTaskSummary: null,
      localTaskSummary: null,
      suggestedFixReasoning: null,
      suggestedFixDescription: null,
      suggestedFix: null,
      shortLink: null,
      couldAutoApplyTasks: null,
      confidence: null,
      confidenceReasoning: null,
      selfHealingSkippedReason: null,
      selfHealingSkipMessage: null,
      error: null,
    };

    const fields = ['cipeStatus', 'nonExistentField'];
    const result: Record<string, unknown> = {};

    for (const field of fields) {
      // Skip fields that don't exist as keys in output
      if (!(field in output)) {
        continue;
      }
      const value = getValueByPath(
        output as unknown as Record<string, unknown>,
        field,
      );
      result[field] = value;
    }

    // nonExistentField should be skipped, not included with error message
    expect(result).toEqual({
      cipeStatus: 'FAILED',
    });
    expect(result).not.toHaveProperty('nonExistentField');
  });

  it('should truncate long strings in multi-field select', () => {
    // Create a string longer than SELF_HEALING_CHUNK_SIZE
    const longString = 'A'.repeat(SELF_HEALING_CHUNK_SIZE + 500);
    const output: CIInformationOutput = {
      cipeStatus: 'FAILED',
      cipeUrl: 'https://cloud.nx.app/cipes/123',
      branch: 'feature-branch',
      commitSha: null,
      failedTaskIds: [],
      verifiedTaskIds: [],
      selfHealingEnabled: true,
      selfHealingStatus: 'COMPLETED',
      verificationStatus: null,
      userAction: null,
      failureClassification: null,
      taskOutputSummary: null,
      remoteTaskSummary: null,
      localTaskSummary: longString,
      suggestedFixReasoning: null,
      suggestedFixDescription: null,
      suggestedFix: null,
      shortLink: null,
      couldAutoApplyTasks: null,
      confidence: null,
      confidenceReasoning: null,
      selfHealingSkippedReason: null,
      selfHealingSkipMessage: null,
      error: null,
    };

    const fields = ['cipeStatus', 'localTaskSummary'];
    const result: Record<string, unknown> = {};

    for (const field of fields) {
      const value = getValueByPath(
        output as unknown as Record<string, unknown>,
        field,
      );
      if (value === undefined) {
        result[field] = '[Field not found]';
      } else if (
        typeof value === 'string' &&
        value.length > SELF_HEALING_CHUNK_SIZE
      ) {
        // Truncate long strings
        result[field] =
          value.slice(0, SELF_HEALING_CHUNK_SIZE) +
          `...\n\n[Truncated - use select="${field}" alone for full paginated content]`;
      } else {
        result[field] = value;
      }
    }

    expect(result['cipeStatus']).toBe('FAILED');
    expect(typeof result['localTaskSummary']).toBe('string');
    expect((result['localTaskSummary'] as string).length).toBeLessThan(
      longString.length,
    );
    expect(result['localTaskSummary']).toContain('[Truncated');
    expect(result['localTaskSummary']).toContain(
      'use select="localTaskSummary" alone for full paginated content',
    );
  });
});
