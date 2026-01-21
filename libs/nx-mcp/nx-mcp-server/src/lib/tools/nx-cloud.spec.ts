import { CIInformationOutput } from './output-schemas';
import { __testing__ } from './nx-cloud';

const { parseShortLink, formatCIInformationMarkdown } = __testing__;

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

describe('formatCIInformationMarkdown', () => {
  it('should format complete output with all fields', () => {
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
      taskOutputSummary: 'TypeError: undefined is not a function',
      suggestedFixReasoning: 'The variable was undefined',
      suggestedFixDescription: 'Fix the bug',
      suggestedFix: '--- a/file.ts\n+++ b/file.ts\n@@ -1 +1 @@\n-old\n+new',
      shortLink: 'abc-def',
      couldAutoApplyTasks: true,
    };

    const result = formatCIInformationMarkdown(output);

    expect(result).toContain('## CI Pipeline Information');
    expect(result).toContain('### Pipeline Status');
    expect(result).toContain('**Status:** FAILED');
    expect(result).toContain('**Branch:** feature-branch');
    expect(result).toContain('**URL:** https://cloud.nx.app/cipes/123');
    expect(result).toContain('**Commit:** abc123');
    expect(result).toContain('### Failed Tasks');
    expect(result).toContain('app:build, lib:test');
    expect(result).toContain('### Self-Healing');
    expect(result).toContain('**Enabled:** Yes');
    expect(result).toContain('**Status:** COMPLETED');
    expect(result).toContain('**Verification:** COMPLETED');
    expect(result).toContain('**Failure Classification:** build_error');
    expect(result).toContain('**Could Auto-Apply:** Yes');
    expect(result).toContain('### Error Summary');
    expect(result).toContain('TypeError: undefined is not a function');
    expect(result).toContain('### Suggested Fix');
    expect(result).toContain('**Description:** Fix the bug');
    expect(result).toContain('**Reasoning:** The variable was undefined');
    expect(result).toContain('### Patch');
    expect(result).toContain('```diff');
    expect(result).toContain('-old');
    expect(result).toContain('+new');
    expect(result).toContain('### Apply Fix');
    expect(result).toContain('`abc-def`');
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
      suggestedFixReasoning: null,
      suggestedFixDescription: null,
      suggestedFix: null,
      shortLink: null,
      couldAutoApplyTasks: null,
    };

    const result = formatCIInformationMarkdown(output);
    expect(result).toContain('**Enabled:** No');
    expect(result).not.toContain('**Status:** COMPLETED');
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
      suggestedFixReasoning: null,
      suggestedFixDescription: null,
      suggestedFix: null,
      shortLink: null,
      couldAutoApplyTasks: null,
    };

    const result = formatCIInformationMarkdown(output);

    expect(result).not.toContain('### Failed Tasks');
    expect(result).not.toContain('### Error Summary');
    expect(result).not.toContain('### Suggested Fix');
    expect(result).not.toContain('### Patch');
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
      suggestedFixReasoning: null,
      suggestedFixDescription: null,
      suggestedFix: null,
      shortLink: null,
      couldAutoApplyTasks: null,
    };

    const result = formatCIInformationMarkdown(output);
    expect(result).not.toContain('**User Action:**');
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
      suggestedFixReasoning: null,
      suggestedFixDescription: null,
      suggestedFix: null,
      shortLink: null,
      couldAutoApplyTasks: null,
    };

    const result = formatCIInformationMarkdown(output);
    expect(result).toContain('**User Action:** APPLIED_LOCALLY');
  });
});
