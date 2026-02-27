import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CI_POLL } from '@nx-console/shared-llm-context';
import {
  getRecentCIPEData,
  retrieveFixDiff,
} from '@nx-console/shared-nx-cloud';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { CIPEInfo, NxAiFix } from '@nx-console/shared-types';
import { Logger } from '@nx-console/shared-utils';
import { z } from 'zod';
import { isToolEnabled } from '../tool-filter';
import { ToolRegistry, TaskHandlerContext } from '../tool-registry';
import {
  getCurrentGitBranch,
  parseShortLink,
  formatCIInformationOverview,
} from './nx-cloud-utils';
import {
  CIInformationOutput,
  CIPollOutput,
  ciPollOutputSchema,
} from './output-schemas';

const ciPollSchema = z.object({
  branch: z
    .string()
    .optional()
    .describe('Branch to monitor. Defaults to current git branch.'),
  timeout: z
    .number()
    .optional()
    .describe(
      'Max seconds to poll before returning current state. Default: 180.',
    ),
  verbosity: z
    .enum(['minimal', 'medium', 'verbose'])
    .optional()
    .describe('Detail level for status messages. Default: medium.'),
});

type CIPollActionable =
  | 'ci_success'
  | 'fix_available'
  | 'fix_auto_applying'
  | 'fix_failed'
  | 'environment_issue'
  | 'no_fix'
  | 'self_healing_throttled'
  | 'polling_timeout'
  | 'cipe_canceled'
  | 'cipe_timed_out'
  | 'cipe_no_tasks'
  | 'no_cipe';

function checkActionableConditions(
  output: CIInformationOutput,
): CIPollActionable | null {
  const {
    cipeStatus,
    selfHealingEnabled,
    selfHealingStatus,
    verificationStatus,
    failureClassification,
    selfHealingSkippedReason,
    couldAutoApplyTasks,
    suggestedFix,
    failedTaskIds,
  } = output;

  if (cipeStatus === 'SUCCEEDED') return 'ci_success';
  if (cipeStatus === 'CANCELED') return 'cipe_canceled';
  if (cipeStatus === 'TIMED_OUT') return 'cipe_timed_out';

  if (
    selfHealingStatus === 'COMPLETED' &&
    suggestedFix != null &&
    couldAutoApplyTasks === true &&
    verificationStatus === 'COMPLETED'
  ) {
    return 'fix_auto_applying';
  }

  if (
    selfHealingStatus === 'COMPLETED' &&
    suggestedFix != null &&
    (!couldAutoApplyTasks ||
      verificationStatus === 'FAILED' ||
      verificationStatus === 'NOT_EXECUTABLE')
  ) {
    return 'fix_available';
  }

  if (selfHealingStatus === 'FAILED') return 'fix_failed';
  if (failureClassification === 'ENVIRONMENT_STATE') return 'environment_issue';
  if (selfHealingSkippedReason === 'THROTTLED') return 'self_healing_throttled';

  if (
    cipeStatus === 'FAILED' &&
    (!selfHealingEnabled || selfHealingStatus === 'NOT_EXECUTABLE')
  ) {
    return 'no_fix';
  }

  if (
    cipeStatus === 'FAILED' &&
    failedTaskIds.length === 0 &&
    selfHealingStatus == null
  ) {
    return 'cipe_no_tasks';
  }

  return null;
}

function shouldKeepPolling(output: CIInformationOutput): boolean {
  const {
    cipeStatus,
    selfHealingStatus,
    selfHealingSkippedReason,
    failureClassification,
    userAction,
    couldAutoApplyTasks,
    verificationStatus,
  } = output;

  if (cipeStatus === 'IN_PROGRESS' || cipeStatus === 'NOT_STARTED') return true;

  if (
    (selfHealingStatus === 'IN_PROGRESS' ||
      selfHealingStatus === 'NOT_STARTED') &&
    !selfHealingSkippedReason
  ) {
    return true;
  }

  if (failureClassification === 'FLAKY_TASK') return true;
  if (userAction === 'APPLIED_AUTOMATICALLY') return true;

  if (
    couldAutoApplyTasks === true &&
    (verificationStatus === 'NOT_STARTED' ||
      verificationStatus === 'IN_PROGRESS')
  ) {
    return true;
  }

  return false;
}

function getBackoffDelay(pollCount: number): number {
  if (pollCount <= 1) return 60000;
  if (pollCount === 2) return 90000;
  return 120000;
}

function formatStatusMinimal(
  output: CIInformationOutput,
  _pollCount: number,
  prevState: string | null,
): { message: string; state: string } | null {
  const state = `${output.cipeStatus}|${output.selfHealingStatus ?? 'none'}|${output.verificationStatus ?? 'none'}`;
  if (state === prevState) return null;

  const parts: string[] = [];
  if (
    output.cipeStatus === 'FAILED' &&
    output.selfHealingStatus === 'IN_PROGRESS'
  ) {
    parts.push('⚡ CI failed — self-healing started');
  } else if (
    output.selfHealingStatus === 'COMPLETED' &&
    output.verificationStatus === 'IN_PROGRESS'
  ) {
    parts.push('🔧 Fix generated — verification running');
  } else if (output.cipeStatus === 'IN_PROGRESS') {
    parts.push('⏳ CI running');
  } else {
    parts.push(
      `CI: ${output.cipeStatus} | SH: ${output.selfHealingStatus ?? 'n/a'}`,
    );
  }

  return { message: parts.join(' '), state };
}

function formatStatusMedium(
  output: CIInformationOutput,
  pollCount: number,
  nextDelaySec: number,
): string {
  const parts = [`Poll #${pollCount}`, `CI: ${output.cipeStatus}`];

  if (output.selfHealingStatus) {
    parts.push(`Self-healing: ${output.selfHealingStatus}`);
  }
  if (output.verificationStatus) {
    parts.push(`Verification: ${output.verificationStatus}`);
  }
  parts.push(`Next: ${nextDelaySec}s`);

  return parts.join(' | ');
}

function formatStatusVerbose(
  output: CIInformationOutput,
  pollCount: number,
  nextDelaySec: number,
): string {
  const lines = [`Poll #${pollCount}`];

  lines.push(`  CI Pipeline: ${output.cipeStatus}`);
  if (output.branch) lines.push(`  Branch: ${output.branch}`);
  if (output.failedTaskIds.length > 0) {
    lines.push(`  Failed tasks: ${output.failedTaskIds.join(', ')}`);
  }

  if (output.selfHealingEnabled) {
    lines.push(`  Self-healing: ${output.selfHealingStatus ?? 'pending'}`);
    if (output.selfHealingSkippedReason) {
      lines.push(`  Skipped: ${output.selfHealingSkippedReason}`);
    }
    if (output.verificationStatus) {
      lines.push(`  Verification: ${output.verificationStatus}`);
    }
    if (
      output.selfHealingStatus === 'COMPLETED' &&
      output.verificationStatus === 'IN_PROGRESS'
    ) {
      lines.push('  → Fix generated! Verification running...');
    }
    if (output.couldAutoApplyTasks) {
      lines.push('  → Auto-apply enabled');
    }
  }

  lines.push(`  Next poll in ${nextDelaySec}s`);
  return lines.join('\n');
}

const HEAVY_FIELD_STATUSES: Record<string, boolean> = {
  fix_available: true,
  fix_failed: true,
  no_fix: true,
  self_healing_throttled: true,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildCIOutput(cipeForBranch: CIPEInfo): CIInformationOutput {
  const failedTaskIds: string[] = [];
  for (const runGroup of cipeForBranch.runGroups) {
    for (const run of runGroup.runs) {
      if (run.failedTasks) {
        for (const taskId of run.failedTasks) {
          if (
            taskId === 'upload-run-result:record-command' ||
            taskId === 'nx-cloud-tasks-runner:record-command'
          ) {
            failedTaskIds.push(run.command);
          } else {
            failedTaskIds.push(taskId);
          }
        }
      }
    }
  }

  let aiFix: NxAiFix | undefined;
  for (const runGroup of cipeForBranch.runGroups) {
    if (runGroup.aiFix) {
      aiFix = runGroup.aiFix;
      break;
    }
  }

  const selfHealingEnabled = cipeForBranch.aiFixesEnabled ?? false;

  return {
    cipeStatus: cipeForBranch.status,
    cipeUrl: cipeForBranch.cipeUrl,
    branch: cipeForBranch.branch,
    commitSha: null,
    failedTaskIds,
    verifiedTaskIds: aiFix?.verificationTasksExecuted ?? [],
    selfHealingEnabled,
    selfHealingStatus: aiFix?.suggestedFixStatus ?? null,
    verificationStatus: aiFix?.verificationStatus ?? null,
    userAction: aiFix?.userAction ?? null,
    failureClassification: aiFix?.failureClassification ?? null,
    taskOutputSummary: null,
    remoteTaskSummary: null,
    localTaskSummary: null,
    suggestedFixReasoning: aiFix?.suggestedFixReasoning ?? null,
    suggestedFixDescription: aiFix?.suggestedFixDescription ?? null,
    suggestedFix: aiFix?.suggestedFix ?? null,
    shortLink: aiFix?.shortLink ?? null,
    couldAutoApplyTasks: aiFix?.couldAutoApplyTasks ?? null,
    confidence: aiFix?.confidenceScore ?? null,
    confidenceReasoning: null,
    selfHealingSkippedReason: cipeForBranch.selfHealingSkipInfo?.reason ?? null,
    selfHealingSkipMessage: cipeForBranch.selfHealingSkipInfo?.message ?? null,
    error: null,
  };
}

async function fetchHeavyFields(
  output: CIInformationOutput,
  workspacePath: string,
  logger: Logger,
): Promise<void> {
  if (!output.shortLink) return;

  const parsed = parseShortLink(output.shortLink);
  if (!parsed) return;

  const fixResult = await retrieveFixDiff(
    workspacePath,
    logger,
    parsed.fixShortLink,
    parsed.suggestionShortLink,
  );

  if (fixResult.data) {
    output.commitSha = fixResult.data.commitSha;
    output.remoteTaskSummary = fixResult.data.remoteTaskSummary ?? null;
    output.localTaskSummary = fixResult.data.localTaskSummary ?? null;
    output.taskOutputSummary =
      output.remoteTaskSummary || output.localTaskSummary
        ? [output.remoteTaskSummary, output.localTaskSummary]
            .filter(Boolean)
            .join('\n\n---\n\n')
        : (fixResult.data.taskOutputSummary ?? null);
    output.suggestedFixReasoning = fixResult.data.suggestedFixReasoning;
    output.suggestedFixDescription = fixResult.data.suggestedFixDescription;
    output.suggestedFix = fixResult.data.suggestedFix;
    output.confidence = fixResult.data.confidence;
    output.confidenceReasoning = fixResult.data.confidenceReasoning;
  }
}

const handleCIPoll =
  (
    workspacePath: string,
    logger: Logger,
    telemetry: NxConsoleTelemetryLogger | undefined,
  ) =>
  async (
    params: z.infer<typeof ciPollSchema>,
    context?: TaskHandlerContext,
  ): Promise<CallToolResult> => {
    telemetry?.logUsage('ai.tool-call', { tool: CI_POLL });

    const timeout = (params.timeout ?? 180) * 1000;
    const verbosity = params.verbosity ?? 'medium';
    const branch =
      params.branch ?? getCurrentGitBranch(workspacePath) ?? undefined;

    if (!branch) {
      return {
        content: [
          {
            type: 'text',
            text: 'Could not determine the current git branch. Please provide a branch name explicitly.',
          },
        ],
        isError: true,
      };
    }

    let pollCount = 0;
    const startTime = Date.now();
    let prevMinimalState: string | null = null;

    while (Date.now() - startTime < timeout) {
      pollCount++;

      const cipeResult = await getRecentCIPEData(workspacePath, logger, {
        branch,
      });

      if (cipeResult.error) {
        const elapsed = (Date.now() - startTime) / 1000;
        const errorOutput: CIPollOutput = {
          cipeStatus: 'FAILED' as const,
          cipeUrl: '',
          branch,
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
          error: cipeResult.error.message,
          pollStatus: 'no_cipe',
          pollCount,
          elapsedSeconds: Math.round(elapsed),
        };
        return {
          content: [
            {
              type: 'text',
              text: `CI poll error: ${cipeResult.error.message}`,
            },
          ],
          structuredContent: errorOutput,
          isError: true,
        };
      }

      const cipeForBranch = cipeResult.info?.find(
        (cipe) => cipe.branch === branch,
      );

      if (!cipeForBranch) {
        // No CIPE found yet — keep polling until timeout
        if (Date.now() - startTime + getBackoffDelay(pollCount) >= timeout) {
          const elapsed = (Date.now() - startTime) / 1000;
          const noCipeOutput: CIPollOutput = {
            cipeStatus: 'NOT_STARTED' as const,
            cipeUrl: '',
            branch,
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
            pollStatus: 'no_cipe',
            pollCount,
            elapsedSeconds: Math.round(elapsed),
          };
          return {
            content: [
              {
                type: 'text',
                text: `No CI pipeline execution found for branch "${branch}" after ${Math.round(elapsed)}s.`,
              },
            ],
            structuredContent: noCipeOutput,
          };
        }

        const statusMsg = `Waiting for CI pipeline on branch "${branch}"...`;
        context?.updateStatus(statusMsg);
        context?.sendProgress(pollCount, null, statusMsg);
        await sleep(getBackoffDelay(pollCount));
        continue;
      }

      // Build CI output (reuse same logic as ci_information)
      const output = buildCIOutput(cipeForBranch);

      // Check actionable conditions
      const actionable = checkActionableConditions(output);

      if (actionable) {
        // Fetch heavy fields for certain statuses before returning
        if (HEAVY_FIELD_STATUSES[actionable]) {
          await fetchHeavyFields(output, workspacePath, logger);
        }

        const elapsed = (Date.now() - startTime) / 1000;
        const pollOutput: CIPollOutput = {
          ...output,
          pollStatus: actionable,
          pollCount,
          elapsedSeconds: Math.round(elapsed),
        };

        const overview = formatCIInformationOverview(output);
        return {
          content: [
            {
              type: 'text',
              text: `## CI Poll Result: ${actionable}\n\n${overview}`,
            },
          ],
          structuredContent: pollOutput,
        };
      }

      // Not actionable — check if we should keep polling
      if (!shouldKeepPolling(output)) {
        // Unexpected state — return what we have
        const elapsed = (Date.now() - startTime) / 1000;
        const pollOutput: CIPollOutput = {
          ...output,
          pollStatus: 'polling_timeout',
          pollCount,
          elapsedSeconds: Math.round(elapsed),
        };
        return {
          content: [
            {
              type: 'text',
              text: formatCIInformationOverview(output),
            },
          ],
          structuredContent: pollOutput,
        };
      }

      // Emit status update
      const delay = getBackoffDelay(pollCount);
      const delaySec = Math.round(delay / 1000);

      let statusMsg: string | null = null;
      if (verbosity === 'minimal') {
        const result = formatStatusMinimal(output, pollCount, prevMinimalState);
        if (result) {
          statusMsg = result.message;
          prevMinimalState = result.state;
        }
      } else if (verbosity === 'verbose') {
        statusMsg = formatStatusVerbose(output, pollCount, delaySec);
      } else {
        statusMsg = formatStatusMedium(output, pollCount, delaySec);
      }

      if (statusMsg) {
        context?.updateStatus(statusMsg);
        context?.sendProgress(pollCount, null, statusMsg);
      }

      await sleep(delay);
    }

    // Timeout reached — fetch one final time and return
    const cipeResult = await getRecentCIPEData(workspacePath, logger, {
      branch,
    });
    const cipeForBranch = cipeResult.info?.find(
      (cipe) => cipe.branch === branch,
    );
    const elapsed = (Date.now() - startTime) / 1000;

    if (!cipeForBranch) {
      const noCipeOutput: CIPollOutput = {
        cipeStatus: 'NOT_STARTED' as const,
        cipeUrl: '',
        branch,
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
        pollStatus: 'no_cipe',
        pollCount,
        elapsedSeconds: Math.round(elapsed),
      };
      return {
        content: [
          {
            type: 'text',
            text: `Polling timeout: No CI pipeline found for branch "${branch}" after ${Math.round(elapsed)}s.`,
          },
        ],
        structuredContent: noCipeOutput,
      };
    }

    const output = buildCIOutput(cipeForBranch);
    await fetchHeavyFields(output, workspacePath, logger);

    const pollOutput: CIPollOutput = {
      ...output,
      pollStatus: 'polling_timeout',
      pollCount,
      elapsedSeconds: Math.round(elapsed),
    };

    const overview = formatCIInformationOverview(output);
    return {
      content: [
        {
          type: 'text',
          text: `## CI Poll Result: polling_timeout (${Math.round(elapsed)}s)\n\n${overview}`,
        },
      ],
      structuredContent: pollOutput,
    };
  };

export function registerCiPollTool(
  workspacePath: string,
  registry: ToolRegistry,
  logger: Logger,
  telemetry?: NxConsoleTelemetryLogger,
  toolsFilter?: string[],
): void {
  if (!isToolEnabled(CI_POLL, toolsFilter)) {
    logger.debug?.(`Skipping ${CI_POLL} - disabled by tools filter`);
    return;
  }

  registry.registerTool({
    name: CI_POLL,
    description:
      'Monitor a CI pipeline execution with automatic polling. Returns when an actionable state is reached ' +
      '(success, fix available, failure, timeout, etc). Supports MCP Tasks protocol for non-blocking execution. ' +
      'Without task augmentation, blocks until actionable and sends progress notifications. ' +
      'Reuses the same CI data as ci_information but polls automatically with backoff.',
    inputSchema: ciPollSchema.shape,
    outputSchema: ciPollOutputSchema,
    execution: { taskSupport: 'optional' },
    annotations: {
      destructiveHint: false,
      readOnlyHint: true,
      openWorldHint: true,
    },
    handler: async (args, context) =>
      handleCIPoll(
        workspacePath,
        logger,
        telemetry,
      )(args as z.infer<typeof ciPollSchema>, context),
  });
}

// Exported for testing
export const __testing__ = {
  checkActionableConditions,
  shouldKeepPolling,
  buildCIOutput,
  getBackoffDelay,
};
