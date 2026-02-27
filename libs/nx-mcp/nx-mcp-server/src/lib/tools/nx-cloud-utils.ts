import { CIInformationOutput } from './output-schemas';
import { execSync } from 'child_process';

const TRUNCATION_LENGTH = 1000;
const DIFF_PREVIEW_LENGTH = 3000;

/**
 * Truncate a string to a maximum length.
 * @param str The string to truncate
 * @param maxLength Maximum length before truncation
 * @param fromEnd If true, keeps the end of the string (most recent content)
 */
export function truncateString(
  str: string,
  maxLength: number,
  fromEnd = false,
): string {
  if (str.length <= maxLength) return str;
  if (fromEnd) {
    return '...' + str.slice(-maxLength);
  }
  return str.slice(0, maxLength) + '...';
}

export function getCurrentGitBranch(workspacePath: string): string | null {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: workspacePath,
      stdio: 'pipe',
    })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

export function parseShortLink(shortLink: string | undefined | null): {
  fixShortLink: string;
  suggestionShortLink: string;
} | null {
  if (!shortLink || typeof shortLink !== 'string') {
    return null;
  }
  const parts = shortLink.split('-');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return {
    fixShortLink: parts[0],
    suggestionShortLink: parts[1],
  };
}

/**
 * Format CI information as a compact overview (no long content like task output or diff).
 * Used when select parameter is not provided.
 */
export function formatCIInformationOverview(
  output: CIInformationOutput,
): string {
  const lines: string[] = [];

  lines.push('## CI Pipeline Information');
  lines.push(
    '_Use the `select` parameter to retrieve any individual property by name._',
  );
  lines.push('');

  // CIPE Status
  lines.push(
    '### Pipeline Status (`cipeStatus`, `branch`, `cipeUrl`, `commitSha`)',
  );
  lines.push(`- **Status:** ${output.cipeStatus}`);
  lines.push(`- **Branch:** ${output.branch}`);
  lines.push(`- **URL:** ${output.cipeUrl}`);
  if (output.commitSha) {
    lines.push(`- **Commit:** ${output.commitSha}`);
  }
  lines.push('');

  // Failed Tasks
  if (output.failedTaskIds.length > 0) {
    lines.push('### Failed Tasks (`failedTaskIds`)');
    lines.push(output.failedTaskIds.join(', '));
    lines.push('');
  }

  // Self-Healing Information
  lines.push(
    '### Self-Healing (`selfHealingEnabled`, `selfHealingStatus`, `verificationStatus`, `userAction`, `failureClassification`, `confidence`, `confidenceReasoning`)',
  );
  lines.push(`- **Enabled:** ${output.selfHealingEnabled ? 'Yes' : 'No'}`);
  if (output.selfHealingEnabled) {
    if (output.selfHealingSkippedReason) {
      lines.push(`- **Skipped:** ${output.selfHealingSkippedReason}`);
      if (output.selfHealingSkipMessage) {
        lines.push(`- **Skip Message:** ${output.selfHealingSkipMessage}`);
      }
    }
    if (output.selfHealingStatus) {
      lines.push(`- **Status:** ${output.selfHealingStatus}`);
    }
    if (output.verificationStatus) {
      lines.push(`- **Verification:** ${output.verificationStatus}`);
    }
    if (output.userAction && output.userAction !== 'NONE') {
      lines.push(`- **User Action:** ${output.userAction}`);
    }
    if (output.failureClassification) {
      lines.push(
        `- **Failure Classification:** ${output.failureClassification}`,
      );
    }
    if (output.couldAutoApplyTasks !== null) {
      lines.push(
        `- **Could Auto-Apply:** ${output.couldAutoApplyTasks ? 'Yes' : 'No'}`,
      );
    }
    if (output.confidence !== null && output.confidence !== undefined) {
      lines.push(`- **Confidence:** ${output.confidence}`);
    }
    if (output.confidenceReasoning) {
      lines.push(`- **Confidence Reasoning:** ${output.confidenceReasoning}`);
    }
  }
  lines.push('');

  // Task output section with truncated previews (show end of logs)
  const hasTaskOutput =
    output.remoteTaskSummary ||
    output.localTaskSummary ||
    output.taskOutputSummary;
  if (hasTaskOutput) {
    lines.push(
      '### Task Output (`remoteTaskSummary`, `localTaskSummary`, `taskOutputSummary`)',
    );
    if (output.remoteTaskSummary) {
      lines.push(
        '**Task Summary (`remoteTaskSummary`) - tasks ran on other machines:**',
      );
      lines.push('```');
      lines.push(
        truncateString(output.remoteTaskSummary, TRUNCATION_LENGTH, true),
      );
      lines.push('```');
    }
    if (output.localTaskSummary) {
      lines.push(
        '**Task Output (`localTaskSummary`) - tasks ran on self-healing agent machine:**',
      );
      lines.push('```');
      lines.push(
        truncateString(output.localTaskSummary, TRUNCATION_LENGTH, true),
      );
      lines.push('```');
    }
    if (
      output.taskOutputSummary &&
      !output.remoteTaskSummary &&
      !output.localTaskSummary
    ) {
      lines.push('**Output:**');
      lines.push('```');
      lines.push(
        truncateString(output.taskOutputSummary, TRUNCATION_LENGTH, true),
      );
      lines.push('```');
    }
    lines.push(
      "_Full output available via `select='remoteTaskSummary'` or `select='localTaskSummary'`_",
    );
    lines.push('');
  }

  // Suggested Fix with truncated diff preview
  if (output.suggestedFixDescription || output.suggestedFix) {
    lines.push(
      '### Suggested Fix (`suggestedFixDescription`, `suggestedFixReasoning`, `suggestedFix`)',
    );
    if (output.suggestedFixDescription) {
      lines.push(`**Description:** ${output.suggestedFixDescription}`);
    }
    if (output.suggestedFixReasoning) {
      lines.push(`**Reasoning:** ${output.suggestedFixReasoning}`);
    }
    if (output.suggestedFix) {
      lines.push('');
      lines.push('#### Diff Preview');
      lines.push('```diff');
      lines.push(truncateString(output.suggestedFix, DIFF_PREVIEW_LENGTH));
      lines.push('```');
      lines.push("_Full diff available via `select='suggestedFix'`_");
    }
    lines.push('');
  }

  // ShortLink for apply tool
  if (output.shortLink) {
    lines.push('### Apply Fix (`shortLink`)');
    lines.push(
      `Use the shortLink \`${output.shortLink}\` with the update_self_healing_fix tool to apply or reject this fix.`,
    );
    lines.push('');
  }

  return lines.join('\n');
}
