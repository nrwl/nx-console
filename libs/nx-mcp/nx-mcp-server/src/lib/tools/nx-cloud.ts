import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  CI_INFORMATION,
  CLOUD_ANALYTICS_PIPELINE_EXECUTION_DETAILS,
  CLOUD_ANALYTICS_PIPELINE_EXECUTIONS_SEARCH,
  CLOUD_ANALYTICS_RUN_DETAILS,
  CLOUD_ANALYTICS_RUNS_SEARCH,
  CLOUD_ANALYTICS_TASK_EXECUTIONS_SEARCH,
  CLOUD_ANALYTICS_TASKS_SEARCH,
} from '@nx-console/shared-llm-context/src/lib/tool-names';
import {
  formatPipelineExecutionDetailsContent,
  formatPipelineExecutionsSearchContent,
  formatRunDetailsContent,
  formatRunsSearchContent,
  formatTasksDetailsSearchContent,
  formatTasksSearchContent,
  getRecentCIPEData,
  getPipelineExecutionDetails,
  getPipelineExecutionsSearch,
  getRunDetails,
  getRunsSearch,
  getTasksDetailsSearch,
  getTasksSearch,
  retrieveFixDiff,
} from '@nx-console/shared-nx-cloud';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { CIPEInfo, NxAiFix } from '@nx-console/shared-types';
import { Logger } from '@nx-console/shared-utils';
import { execSync } from 'child_process';
import { z } from 'zod';
import { isToolEnabled } from '../tool-filter';
import { ToolRegistry } from '../tool-registry';
import { chunkContent } from './nx-workspace';
import {
  CIInformationOutput,
  ciInformationOutputSchema,
} from './output-schemas';

export const SELF_HEALING_CHUNK_SIZE = 10000;

export function registerNxCloudTools(
  workspacePath: string,
  registry: ToolRegistry,
  logger: Logger,
  telemetry?: NxConsoleTelemetryLogger,
  toolsFilter?: string[],
): void {
  if (!isToolEnabled(CLOUD_ANALYTICS_PIPELINE_EXECUTIONS_SEARCH, toolsFilter)) {
    logger.debug?.(
      `Skipping ${CLOUD_ANALYTICS_PIPELINE_EXECUTIONS_SEARCH} - disabled by tools filter`,
    );
  } else {
    registry.registerTool({
      name: CLOUD_ANALYTICS_PIPELINE_EXECUTIONS_SEARCH,
      description:
        'Analyze historical pipeline execution data from Nx Cloud to identify trends and patterns in CI/CD workflows. Use this analytics tool to track pipeline success rates over time, investigate performance patterns across branches or authors, and gain insights into team productivity. Filter by branch, status, author, or time range to analyze specific segments of your CI/CD history. Pipeline executions are the top-level containers in the hierarchy. If a pagination token is returned, call this tool again with the token to retrieve additional results and ensure all data is collected.',
      inputSchema: pipelineExecutionSearchSchema.shape,
      annotations: {
        destructiveHint: false,
        readOnlyHint: true,
        openWorldHint: true,
      },
      handler: async (args) =>
        nxCloudPipelineExecutionsSearch(
          workspacePath,
          logger,
          telemetry,
        )(args as z.infer<typeof pipelineExecutionSearchSchema>),
    });
  }

  if (!isToolEnabled(CLOUD_ANALYTICS_PIPELINE_EXECUTION_DETAILS, toolsFilter)) {
    logger.debug?.(
      `Skipping ${CLOUD_ANALYTICS_PIPELINE_EXECUTION_DETAILS} - disabled by tools filter`,
    );
  } else {
    registry.registerTool({
      name: CLOUD_ANALYTICS_PIPELINE_EXECUTION_DETAILS,
      description:
        'Analyze detailed historical data for a specific pipeline execution in Nx Cloud. Use this analytics tool to investigate the complete structure of a past CI/CD run, understand performance bottlenecks, and identify optimization opportunities. Returns the full hierarchy including run groups and their associated runs, helping you gain insights into how the pipeline was executed and where improvements can be made.',
      inputSchema: pipelineExecutionDetailsSchema.shape,
      annotations: {
        destructiveHint: false,
        readOnlyHint: true,
        openWorldHint: true,
      },
      handler: async (args) =>
        nxCloudPipelineExecutionDetails(
          workspacePath,
          logger,
          telemetry,
        )(args as z.infer<typeof pipelineExecutionDetailsSchema>),
    });
  }

  if (!isToolEnabled(CLOUD_ANALYTICS_RUNS_SEARCH, toolsFilter)) {
    logger.debug?.(
      `Skipping ${CLOUD_ANALYTICS_RUNS_SEARCH} - disabled by tools filter`,
    );
  } else {
    registry.registerTool({
      name: CLOUD_ANALYTICS_RUNS_SEARCH,
      description:
        'Analyze historical run data from Nx Cloud to track performance trends and team productivity patterns. Runs are mid-level containers within pipeline executions, each representing execution of a specific command (like "nx affected:build"). Use this analytics tool to identify which commands are taking the longest, track success rates across different run groups, and understand how your team\'s build patterns have evolved over time. Filter by pipeline execution, branch, run group, or status to analyze specific segments. If a pagination token is returned, call this tool again with the token to retrieve additional results and ensure all data is collected.',
      inputSchema: runSearchSchema.shape,
      annotations: {
        destructiveHint: false,
        readOnlyHint: true,
        openWorldHint: true,
      },
      handler: async (args) =>
        nxCloudRunsSearch(
          workspacePath,
          logger,
          telemetry,
        )(args as z.infer<typeof runSearchSchema>),
    });
  }

  if (!isToolEnabled(CLOUD_ANALYTICS_RUN_DETAILS, toolsFilter)) {
    logger.debug?.(
      `Skipping ${CLOUD_ANALYTICS_RUN_DETAILS} - disabled by tools filter`,
    );
  } else {
    registry.registerTool({
      name: CLOUD_ANALYTICS_RUN_DETAILS,
      description:
        'Analyze detailed historical data for a specific run in Nx Cloud. Use this analytics tool to investigate command execution performance, understand task distribution patterns, and identify optimization opportunities. Returns comprehensive information including the command executed, duration, status, and all tasks that were part of this run, helping you gain insights into where time is being spent and how to improve build efficiency.',
      inputSchema: runDetailsSchema.shape,
      annotations: {
        destructiveHint: false,
        readOnlyHint: true,
        openWorldHint: true,
      },
      handler: async (args) =>
        nxCloudRunDetails(
          workspacePath,
          logger,
          telemetry,
        )(args as z.infer<typeof runDetailsSchema>),
    });
  }

  if (!isToolEnabled(CLOUD_ANALYTICS_TASKS_SEARCH, toolsFilter)) {
    logger.debug?.(
      `Skipping ${CLOUD_ANALYTICS_TASKS_SEARCH} - disabled by tools filter`,
    );
  } else {
    registry.registerTool({
      name: CLOUD_ANALYTICS_TASKS_SEARCH,
      description:
        'Analyze aggregated task performance statistics from Nx Cloud to identify optimization opportunities and track trends over time. Returns performance metrics including success rates, cache hit rates, and average durations for each task (project + target combination). Use this analytics tool to understand which tasks are the slowest, track cache effectiveness trends, identify projects with low success rates, and gain insights into overall team productivity patterns. Filter by project, target, or time range to analyze specific segments. If a pagination token is returned, call this tool again with the token to retrieve additional results and ensure all data is collected.',
      inputSchema: taskSearchSchema.shape,
      annotations: {
        destructiveHint: false,
        readOnlyHint: true,
        openWorldHint: true,
      },
      handler: async (args) =>
        nxCloudTasksSearch(
          workspacePath,
          logger,
          telemetry,
        )(args as z.infer<typeof taskSearchSchema>),
    });
  }

  if (!isToolEnabled(CLOUD_ANALYTICS_TASK_EXECUTIONS_SEARCH, toolsFilter)) {
    logger.debug?.(
      `Skipping ${CLOUD_ANALYTICS_TASK_EXECUTIONS_SEARCH} - disabled by tools filter`,
    );
  } else {
    registry.registerTool({
      name: CLOUD_ANALYTICS_TASK_EXECUTIONS_SEARCH,
      description:
        'Analyze individual task execution data from Nx Cloud to investigate performance trends and understand task behavior over time. Returns detailed information for each task execution including project, target, duration, cache status, and parameters. Use this analytics tool to track how specific tasks perform across different runs, identify patterns in cache misses, and gain insights into which task configurations are most efficient. Filter by project, target, or time range to analyze specific execution patterns. If a pagination token is returned, call this tool again with the token to retrieve additional results and ensure all data is collected.',
      inputSchema: taskDetailsSchema.shape,
      annotations: {
        destructiveHint: false,
        readOnlyHint: true,
        openWorldHint: true,
      },
      handler: async (args) =>
        nxCloudTaskDetails(
          workspacePath,
          logger,
          telemetry,
        )(args as z.infer<typeof taskDetailsSchema>),
    });
  }

  if (!isToolEnabled(CI_INFORMATION, toolsFilter)) {
    logger.debug?.(`Skipping ${CI_INFORMATION} - disabled by tools filter`);
  } else {
    registry.registerTool({
      name: CI_INFORMATION,
      description:
        'Retrieve CI pipeline execution information from Nx Cloud for the current branch. Returns CIPE status, failed task IDs, and self-healing fix information when available. Use this tool to monitor CI status and react to failures.',
      inputSchema: ciInformationSchema.shape,
      outputSchema: ciInformationOutputSchema,
      annotations: {
        destructiveHint: false,
        readOnlyHint: true,
        openWorldHint: true,
      },
      handler: async (args) =>
        getCIInformation(
          workspacePath,
          logger,
          telemetry,
        )(args as z.infer<typeof ciInformationSchema>),
    });
  }

  logger.debug?.('Registered Nx Cloud tools');
}

export const renderCipeDetails = (cipe: CIPEInfo): string => {
  const lines: string[] = [];
  lines.push(`- ${cipe.cipeUrl} (CIPE Status: ${cipe.status})`);
  for (const runGroup of cipe.runGroups) {
    lines.push(
      `  -- Run Group: ${runGroup.runGroup} (Run Group Status: ${runGroup.status})`,
    );
    for (const run of runGroup.runs) {
      let runPrompt = `    --- Run ${run.command} \n          `;
      if (run.executionId) {
        runPrompt += ` Execution ID: ${run.executionId}`;
      }
      if (run.linkId) {
        runPrompt += ` Link ID: ${run.linkId}`;
      }

      runPrompt += ` (Run Status: ${run.status})`;

      lines.push(runPrompt);
      for (const task of run.failedTasks ?? []) {
        lines.push(`      ---- Failed Task: ${task}`);
      }
      if (run.status === 'CANCELED') {
        lines.push(
          `      ---- Note: This run was canceled, indicating no failures occurred.`,
        );
      }
    }
  }
  return lines.join('\n');
};

// Schemas for the new tools
const pipelineExecutionSearchSchema = z.object({
  branches: z
    .array(z.string())
    .optional()
    .describe('Filter by specific branches'),
  statuses: z
    .array(z.string())
    .optional()
    .describe(
      'Filter by execution statuses (e.g., "NOT_STARTED", "IN_PROGRESS", "SUCCEEDED", "FAILED", "CANCELED", "TIMED_OUT")',
    ),
  authors: z.array(z.string()).optional().describe('Filter by commit authors'),
  repositoryUrl: z.string().optional().describe('Filter by repository URL'),
  minCreatedAt: z
    .string()
    .optional()
    .describe(
      'Minimum creation time. Can be an exact date or relative to today in natural language (e.g., "2024-01-01", "yesterday", "3 days ago", "last week")',
    ),
  maxCreatedAt: z
    .string()
    .optional()
    .describe(
      'Maximum creation time. Can be an exact date or relative to today in natural language (e.g., "2024-12-31", "today", "2 hours ago", "last month")',
    ),
  vcsTitleContains: z
    .string()
    .optional()
    .describe('Filter by VCS title containing this text'),
  limit: z
    .number()
    .optional()
    .default(50)
    .describe('Maximum number of results to return'),
  pageToken: z.string().optional().describe('Token for pagination'),
});

const pipelineExecutionDetailsSchema = z.object({
  pipelineExecutionId: z
    .string()
    .describe('The ID of the pipeline execution to retrieve'),
});

const runSearchSchema = z.object({
  pipelineExecutionId: z
    .string()
    .optional()
    .describe('Filter by pipeline execution ID'),
  branches: z
    .array(z.string())
    .optional()
    .describe('Filter by specific branches'),
  runGroups: z
    .array(z.string())
    .optional()
    .describe('Filter by run group names'),
  commitShas: z.array(z.string()).optional().describe('Filter by commit SHAs'),
  statuses: z
    .array(z.string())
    .optional()
    .describe(
      'Filter by run statuses (e.g., "NOT_STARTED", "IN_PROGRESS", "SUCCEEDED", "FAILED", "CANCELED", "TIMED_OUT")',
    ),
  minStartTime: z
    .string()
    .optional()
    .describe(
      'Minimum start time. Can be an exact date or relative to today in natural language (e.g., "2024-01-01", "yesterday", "3 days ago", "last week")',
    ),
  maxStartTime: z
    .string()
    .optional()
    .describe(
      'Maximum start time. Can be an exact date or relative to today in natural language (e.g., "2024-12-31", "today", "2 hours ago", "last month")',
    ),
  limit: z
    .number()
    .optional()
    .default(50)
    .describe('Maximum number of results to return'),
  pageToken: z.string().optional().describe('Token for pagination'),
});

const runDetailsSchema = z.object({
  runId: z.string().describe('The ID of the run to retrieve'),
});

const taskSearchSchema = z.object({
  taskIds: z
    .array(z.string())
    .optional()
    .describe('Filter by specific task IDs'),
  projectNames: z
    .array(z.string())
    .optional()
    .describe('Filter by project names'),
  targets: z.array(z.string()).optional().describe('Filter by target names'),
  configurations: z
    .array(z.string())
    .optional()
    .describe('Filter by configurations'),
  minStartTime: z
    .string()
    .optional()
    .describe(
      'Minimum start time. Can be an exact date or relative to today in natural language (e.g., "2024-01-01", "yesterday", "3 days ago", "last week")',
    ),
  maxStartTime: z
    .string()
    .optional()
    .describe(
      'Maximum start time. Can be an exact date or relative to today in natural language (e.g., "2024-12-31", "today", "2 hours ago", "last month")',
    ),
  limit: z
    .number()
    .optional()
    .default(100)
    .describe('Maximum number of results to return'),
  pageToken: z.string().optional().describe('Token for pagination'),
  includeLocal: z
    .boolean()
    .optional()
    .describe(
      'Include data from local machine runs in addition to CI data. If false or omitted, only CI data is included.',
    ),
});

const taskDetailsSchema = z.object({
  taskIds: z
    .array(z.string())
    .optional()
    .describe('Filter by specific task IDs'),
  projectNames: z
    .array(z.string())
    .optional()
    .describe('Filter by project names'),
  targets: z.array(z.string()).optional().describe('Filter by target names'),
  configurations: z
    .array(z.string())
    .optional()
    .describe('Filter by configurations'),
  minStartTime: z
    .string()
    .optional()
    .describe(
      'Minimum start time. Can be an exact date or relative to today in natural language (e.g., "2024-01-01", "yesterday", "3 days ago", "last week")',
    ),
  maxStartTime: z
    .string()
    .optional()
    .describe(
      'Maximum start time. Can be an exact date or relative to today in natural language (e.g., "2024-12-31", "today", "2 hours ago", "last month")',
    ),
  limit: z
    .number()
    .optional()
    .default(100)
    .describe('Maximum number of results to return'),
  pageToken: z.string().optional().describe('Token for pagination'),
  includeLocal: z
    .boolean()
    .optional()
    .describe(
      'Include data from local machine runs in addition to CI data. If false or omitted, only CI data is included.',
    ),
});

const ciInformationSchema = z.object({
  branch: z
    .string()
    .optional()
    .describe('Branch name to query. Defaults to current git branch.'),
  pageToken: z
    .number()
    .optional()
    .describe(
      'Token for pagination of long content (0-based page number). ' +
        'If not provided, returns page 0.',
    ),
});

// Implementation functions
const nxCloudPipelineExecutionsSearch =
  (
    workspacePath: string,
    logger: Logger,
    telemetry: NxConsoleTelemetryLogger | undefined,
  ) =>
  async (
    params: z.infer<typeof pipelineExecutionSearchSchema>,
  ): Promise<CallToolResult> => {
    telemetry?.logUsage('ai.tool-call', {
      tool: CLOUD_ANALYTICS_PIPELINE_EXECUTIONS_SEARCH,
    });

    const result = await getPipelineExecutionsSearch(
      workspacePath,
      logger,
      params,
    );

    if (result.error) {
      throw new Error(
        `Error searching pipeline executions: ${result.error.message}`,
      );
    }

    const textContent = formatPipelineExecutionsSearchContent(result.data!);
    const content: CallToolResult['content'] = textContent.map((text) => ({
      type: 'text',
      text,
    }));

    return { content };
  };

const nxCloudPipelineExecutionDetails =
  (
    workspacePath: string,
    logger: Logger,
    telemetry: NxConsoleTelemetryLogger | undefined,
  ) =>
  async (
    params: z.infer<typeof pipelineExecutionDetailsSchema>,
  ): Promise<CallToolResult> => {
    telemetry?.logUsage('ai.tool-call', {
      tool: CLOUD_ANALYTICS_PIPELINE_EXECUTION_DETAILS,
    });

    const result = await getPipelineExecutionDetails(
      workspacePath,
      logger,
      params.pipelineExecutionId,
    );

    if (result.error) {
      throw new Error(
        `Error getting pipeline execution details: ${result.error.message}`,
      );
    }

    const textContent = formatPipelineExecutionDetailsContent(result.data!);
    const content: CallToolResult['content'] = textContent.map((text) => ({
      type: 'text',
      text,
    }));

    return { content };
  };

// In Progress
const nxCloudRunsSearch =
  (
    workspacePath: string,
    logger: Logger,
    telemetry: NxConsoleTelemetryLogger | undefined,
  ) =>
  async (params: z.infer<typeof runSearchSchema>): Promise<CallToolResult> => {
    telemetry?.logUsage('ai.tool-call', {
      tool: CLOUD_ANALYTICS_RUNS_SEARCH,
    });

    const result = await getRunsSearch(workspacePath, logger, params);

    if (result.error) {
      throw new Error(`Error searching runs: ${result.error.message}`);
    }

    const textContent = formatRunsSearchContent(result.data!);
    const content: CallToolResult['content'] = textContent.map((text) => ({
      type: 'text',
      text,
    }));

    return { content };
  };

const nxCloudRunDetails =
  (
    workspacePath: string,
    logger: Logger,
    telemetry: NxConsoleTelemetryLogger | undefined,
  ) =>
  async (params: z.infer<typeof runDetailsSchema>): Promise<CallToolResult> => {
    telemetry?.logUsage('ai.tool-call', {
      tool: CLOUD_ANALYTICS_RUN_DETAILS,
    });

    const result = await getRunDetails(workspacePath, logger, params.runId);

    if (result.error) {
      throw new Error(`Error getting run details: ${result.error.message}`);
    }

    const textContent = formatRunDetailsContent(result.data!);
    const content: CallToolResult['content'] = textContent.map((text) => ({
      type: 'text',
      text,
    }));

    return { content };
  };

const nxCloudTasksSearch =
  (
    workspacePath: string,
    logger: Logger,
    telemetry: NxConsoleTelemetryLogger | undefined,
  ) =>
  async (params: z.infer<typeof taskSearchSchema>): Promise<CallToolResult> => {
    telemetry?.logUsage('ai.tool-call', {
      tool: CLOUD_ANALYTICS_TASKS_SEARCH,
    });

    const result = await getTasksSearch(workspacePath, logger, params);

    if (result.error) {
      throw new Error(`Error searching tasks: ${result.error.message}`);
    }

    const textContent = formatTasksSearchContent(result.data!);
    const content: CallToolResult['content'] = textContent.map((text) => ({
      type: 'text',
      text,
    }));

    return { content };
  };

const nxCloudTaskDetails =
  (
    workspacePath: string,
    logger: Logger,
    telemetry: NxConsoleTelemetryLogger | undefined,
  ) =>
  async (
    params: z.infer<typeof taskDetailsSchema>,
  ): Promise<CallToolResult> => {
    telemetry?.logUsage('ai.tool-call', {
      tool: CLOUD_ANALYTICS_TASK_EXECUTIONS_SEARCH,
    });

    const result = await getTasksDetailsSearch(workspacePath, logger, params);

    if (result.error) {
      throw new Error(`Error searching task details: ${result.error.message}`);
    }

    const textContent = formatTasksDetailsSearchContent(result.data!);
    const content: CallToolResult['content'] = textContent.map(
      (text: string) => ({
        type: 'text',
        text,
      }),
    );

    return { content };
  };

function getCurrentGitBranch(workspacePath: string): string | null {
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

function parseShortLink(shortLink: string): {
  fixShortLink: string;
  suggestionShortLink: string;
} | null {
  const parts = shortLink.split('-');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return {
    fixShortLink: parts[0],
    suggestionShortLink: parts[1],
  };
}

const getCIInformation =
  (
    workspacePath: string,
    logger: Logger,
    telemetry: NxConsoleTelemetryLogger | undefined,
  ) =>
  async (
    params: z.infer<typeof ciInformationSchema>,
  ): Promise<CallToolResult> => {
    telemetry?.logUsage('ai.tool-call', {
      tool: CI_INFORMATION,
    });

    // Determine branch (parameter or current git branch)
    const branch = params.branch ?? getCurrentGitBranch(workspacePath);
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

    // Fetch CIPE data for branch
    const cipeResult = await getRecentCIPEData(workspacePath, logger);

    if (cipeResult.error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to retrieve CI information: ${cipeResult.error.message}. Please check your Nx Cloud connection and authentication.`,
          },
        ],
        isError: true,
      };
    }

    // Find CIPE for the specified branch (most recent one)
    const cipeForBranch = cipeResult.info?.find(
      (cipe) => cipe.branch === branch,
    );

    if (!cipeForBranch) {
      return {
        content: [
          {
            type: 'text',
            text: `No CI pipeline execution found for branch "${branch}". This branch may not have any CI runs yet.`,
          },
        ],
        isError: false,
      };
    }

    // Collect all failed task IDs from all runs
    const failedTaskIds: string[] = [];
    for (const runGroup of cipeForBranch.runGroups) {
      for (const run of runGroup.runs) {
        if (run.failedTasks) {
          failedTaskIds.push(...run.failedTasks);
        }
      }
    }

    // Find AI fix from run groups
    let aiFix: NxAiFix | undefined;
    for (const runGroup of cipeForBranch.runGroups) {
      if (runGroup.aiFix) {
        aiFix = runGroup.aiFix;
        break;
      }
    }

    const selfHealingEnabled = cipeForBranch.aiFixesEnabled ?? false;

    // Build the base output
    const output: CIInformationOutput = {
      cipeStatus: cipeForBranch.status,
      cipeUrl: cipeForBranch.cipeUrl,
      branch: cipeForBranch.branch,
      commitSha: null,
      failedTaskIds,
      selfHealingEnabled,
      selfHealingStatus: aiFix?.suggestedFixStatus ?? null,
      verificationStatus: aiFix?.verificationStatus ?? null,
      userAction: aiFix?.userAction ?? null,
      failureClassification: aiFix?.failureClassification ?? null,
      taskOutputSummary: null,
      suggestedFixReasoning: aiFix?.suggestedFixReasoning ?? null,
      suggestedFixDescription: aiFix?.suggestedFixDescription ?? null,
      suggestedFix: aiFix?.suggestedFix ?? null,
      shortLink: aiFix?.shortLink ?? null,
    };

    // If we have a shortLink and fix is completed, fetch detailed fix data
    if (aiFix?.shortLink && aiFix.suggestedFixStatus === 'COMPLETED') {
      const parsed = parseShortLink(aiFix.shortLink);
      if (parsed) {
        const fixResult = await retrieveFixDiff(
          workspacePath,
          logger,
          parsed.fixShortLink,
          parsed.suggestionShortLink,
        );
        if (fixResult.data) {
          output.commitSha = fixResult.data.commitSha;
          output.taskOutputSummary = fixResult.data.taskOutputSummary;
          output.suggestedFixReasoning = fixResult.data.suggestedFixReasoning;
          output.suggestedFixDescription =
            fixResult.data.suggestedFixDescription;
          output.suggestedFix = fixResult.data.suggestedFix;
        }
      }
    }

    // Format text content
    const textContent = formatCIInformationMarkdown(output);

    // Apply pagination
    const pageNumber = params.pageToken ?? 0;
    const { chunk, hasMore } = chunkContent(
      textContent,
      pageNumber,
      SELF_HEALING_CHUNK_SIZE,
    );

    const content: CallToolResult['content'] = [{ type: 'text', text: chunk }];

    if (hasMore) {
      content.push({
        type: 'text',
        text: `Next page token: ${pageNumber + 1}. Call this tool again with the next page token to continue.`,
      });
    }

    return { content, structuredContent: output };
  };

function formatCIInformationMarkdown(output: CIInformationOutput): string {
  const lines: string[] = [];

  lines.push('## CI Pipeline Information');
  lines.push('');

  // CIPE Status
  lines.push('### Pipeline Status');
  lines.push(`- **Status:** ${output.cipeStatus}`);
  lines.push(`- **Branch:** ${output.branch}`);
  lines.push(`- **URL:** ${output.cipeUrl}`);
  if (output.commitSha) {
    lines.push(`- **Commit:** ${output.commitSha}`);
  }
  lines.push('');

  // Failed Tasks
  if (output.failedTaskIds.length > 0) {
    lines.push('### Failed Tasks');
    lines.push(output.failedTaskIds.join(', '));
    lines.push('');
  }

  // Self-Healing Information
  lines.push('### Self-Healing');
  lines.push(`- **Enabled:** ${output.selfHealingEnabled ? 'Yes' : 'No'}`);
  if (output.selfHealingEnabled) {
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
  }
  lines.push('');

  // Error Summary
  if (output.taskOutputSummary) {
    lines.push('### Error Summary');
    lines.push(output.taskOutputSummary);
    lines.push('');
  }

  // Suggested Fix
  if (output.suggestedFix || output.suggestedFixDescription) {
    lines.push('### Suggested Fix');
    if (output.suggestedFixDescription) {
      lines.push(`**Description:** ${output.suggestedFixDescription}`);
    }
    if (output.suggestedFixReasoning) {
      lines.push(`**Reasoning:** ${output.suggestedFixReasoning}`);
    }
    lines.push('');

    if (output.suggestedFix) {
      lines.push('### Patch');
      lines.push('```diff');
      lines.push(output.suggestedFix);
      lines.push('```');
      lines.push('');
    }
  }

  // ShortLink for apply tool
  if (output.shortLink) {
    lines.push('### Apply Fix');
    lines.push(
      `Use the shortLink \`${output.shortLink}\` with the apply tool to apply this fix.`,
    );
    lines.push('');
  }

  return lines.join('\n');
}

// Exported for testing
export const __testing__ = {
  parseShortLink,
  formatCIInformationMarkdown,
};
