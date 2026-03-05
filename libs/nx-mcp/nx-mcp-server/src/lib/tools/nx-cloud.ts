import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  CI_INFORMATION,
  CLOUD_ANALYTICS_PIPELINE_EXECUTION_DETAILS,
  CLOUD_ANALYTICS_PIPELINE_EXECUTIONS_SEARCH,
  CLOUD_ANALYTICS_RUN_DETAILS,
  CLOUD_ANALYTICS_RUNS_SEARCH,
  CLOUD_ANALYTICS_TASK_EXECUTIONS_SEARCH,
  CLOUD_ANALYTICS_TASKS_SEARCH,
  UPDATE_SELF_HEALING_FIX,
} from '@nx-console/shared-llm-context';
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
  parseNxCloudUrl,
  ParsedNxCloudUrl,
  retrieveFixDiff,
  updateSuggestedFix,
} from '@nx-console/shared-nx-cloud';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { CIPEInfo, NxAiFix } from '@nx-console/shared-types';
import { Logger } from '@nx-console/shared-utils';
import { execSync } from 'child_process';
import { z } from 'zod';
import { isToolEnabled } from '../tool-filter';
import { ToolRegistry } from '../tool-registry';
import { registerPolygraphTools } from './nx-cloud-polygraph';
import { chunkContent, getValueByPath } from './nx-workspace';
import {
  CIInformationOutput,
  ciInformationOutputSchema,
  UpdateSelfHealingFixOutput,
  updateSelfHealingFixOutputSchema,
} from './output-schemas';

export const SELF_HEALING_CHUNK_SIZE = 10000;

const TRUNCATION_LENGTH = 1000;
const DIFF_PREVIEW_LENGTH = 3000;

/**
 * Truncate a string to a maximum length.
 * @param str The string to truncate
 * @param maxLength Maximum length before truncation
 * @param fromEnd If true, keeps the end of the string (most recent content)
 */
function truncateString(
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

/**
 * Fields that should use reverse pagination (task outputs - most recent first).
 */
const REVERSE_PAGINATION_FIELDS = [
  'remoteTaskSummary',
  'localTaskSummary',
  'taskOutputSummary',
];

/**
 * Chunk content from the end (reverse pagination).
 * Page 0 returns the most recent content (end of string).
 * Higher page numbers return progressively older content.
 */
export function chunkContentReverse(
  content: string,
  pageNumber: number,
  chunkSize: number,
): { chunk: string; hasMore: boolean } {
  if (!content || content.length === 0) {
    return { chunk: '', hasMore: false };
  }

  const len = content.length;
  const endIndex = len - pageNumber * chunkSize;
  const startIndex = Math.max(0, endIndex - chunkSize);

  if (endIndex <= 0) {
    return { chunk: `no more content on page ${pageNumber}`, hasMore: false };
  }

  let chunk = content.slice(startIndex, endIndex);
  const hasMore = startIndex > 0;

  if (hasMore) {
    chunk = `...[older output on page ${pageNumber + 1}]\n${chunk}`;
  }

  return { chunk, hasMore };
}

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
        'Retrieve CI pipeline execution information from Nx Cloud for the current branch. ' +
        'Supports Nx Cloud URLs: CIPE URLs (/cipes/{id}), run URLs (/runs/{id}), and task URLs (/runs/{id}/task/{taskId}). ' +
        'Without select parameter: Returns formatted overview (CIPE status, failed task IDs, self-healing status). ' +
        'With select parameter: Returns raw JSON value at specified path. ' +
        'Includes selfHealingSkippedReason/selfHealingSkipMessage when self-healing was skipped (e.g. THROTTLED). ' +
        'See output schema for available fields. Long strings are paginated automatically.',
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

  if (!isToolEnabled(UPDATE_SELF_HEALING_FIX, toolsFilter)) {
    logger.debug?.(
      `Skipping ${UPDATE_SELF_HEALING_FIX} - disabled by tools filter`,
    );
  } else {
    registry.registerTool({
      name: UPDATE_SELF_HEALING_FIX,
      description:
        'Apply or reject a self-healing CI fix from Nx Cloud. Use this tool after reviewing a suggested fix to record your decision. The fix can be identified by aiFixId, shortLink, or auto-detected from the current branch.',
      inputSchema: updateSelfHealingFixSchema.shape,
      outputSchema: updateSelfHealingFixOutputSchema,
      annotations: {
        destructiveHint: false,
        readOnlyHint: false,
        openWorldHint: true,
      },
      handler: async (args) =>
        handleUpdateSelfHealingFix(
          workspacePath,
          logger,
          telemetry,
        )(args as z.infer<typeof updateSelfHealingFixSchema>),
    });
  }

  registerPolygraphTools(workspacePath, registry, logger, toolsFilter);

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
        // Transform record-command tasks to use the actual command for better understanding
        const displayTask =
          task === 'upload-run-result:record-command' ||
          task === 'nx-cloud-tasks-runner:record-command'
            ? run.command
            : task;
        lines.push(`      ---- Failed Task: ${displayTask}`);
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
  url: z
    .string()
    .optional()
    .describe(
      'An Nx Cloud URL to fetch information for. Supports CIPE URLs (/cipes/{id}), ' +
        'run URLs (/runs/{id}), and task URLs (/runs/{id}/task/{taskId}). ' +
        'If provided, branch parameter is ignored.',
    ),
  branch: z
    .string()
    .optional()
    .describe('Branch name to query. Defaults to current git branch.'),
  select: z
    .string()
    .optional()
    .describe(
      'Comma-separated field names to select from CI information. ' +
        'Single field: Returns raw value with pagination for long strings. ' +
        'Multiple fields: Returns object with field values (truncated, no pagination). ' +
        'Without select: Returns formatted overview.',
    ),
  pageToken: z
    .number()
    .optional()
    .describe(
      'Pagination token (0-based). Only used when select returns a long string value. ' +
        'Task summaries use reverse pagination (page 0 = most recent output). ' +
        'Other strings use forward pagination (page 0 = start).',
    ),
});

const updateSelfHealingFixSchema = z.object({
  aiFixId: z
    .string()
    .optional()
    .describe('Direct AI fix ID to apply or reject.'),
  shortLink: z
    .string()
    .optional()
    .describe(
      'Human-readable short link for the fix (e.g., from ci_information tool output).',
    ),
  branch: z
    .string()
    .optional()
    .describe(
      'Branch name to find the fix for. Defaults to current git branch. Only used when aiFixId and shortLink are not provided.',
    ),
  action: z
    .enum(['APPLY', 'REJECT', 'RERUN_ENVIRONMENT_STATE'])
    .describe(
      'Action to perform on the fix: APPLY to accept, REJECT to decline, RERUN_ENVIRONMENT_STATE to request a CI rerun (only available for pipeline executions that failed due to an environment issue).',
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

function parseShortLink(shortLink: string | undefined | null): {
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

async function resolveUrlToBranch(
  parsed: ParsedNxCloudUrl,
  workspacePath: string,
  logger: Logger,
): Promise<{
  branch?: string;
  cipeId?: string;
  error?: string;
}> {
  if (parsed.type === 'cipe') {
    const pipelineResult = await getPipelineExecutionDetails(
      workspacePath,
      logger,
      parsed.cipeId,
    );
    if (pipelineResult.error) {
      return {
        error: `Error looking up CI Pipeline Execution: ${pipelineResult.error.message}`,
      };
    }
    return {
      branch: pipelineResult.data.vcsContext?.ref,
      cipeId: parsed.cipeId,
    };
  }

  // For run and task URLs, look up the run by its URL slug (linkId)
  const runId = parsed.runId;
  const runResult = await getRunDetails(workspacePath, logger, runId);
  if (runResult.error) {
    if (runResult.error.type === 'not_found') {
      return {
        error:
          `Run "${runId}" not found. The API may not yet support looking up runs by their URL identifier. ` +
          `Try providing a CIPE URL (/cipes/{id}) or a branch name instead.`,
      };
    }
    return {
      error: `Error looking up run: ${runResult.error.message}`,
    };
  }

  return {
    branch: runResult.data.branch,
    cipeId: runResult.data.distributedExecutionId,
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

    // Determine the branch to look up - either from URL or from params/git
    let branch: string | undefined;
    let cipeIdFromUrl: string | undefined;

    if (params.url) {
      const parsed = parseNxCloudUrl(params.url);
      if (!parsed) {
        return {
          content: [
            {
              type: 'text',
              text: 'Invalid Nx Cloud URL. Supported patterns: /cipes/{id}, /runs/{id}, /runs/{id}/task/{taskId}',
            },
          ],
          isError: true,
        };
      }

      const urlResolution = await resolveUrlToBranch(
        parsed,
        workspacePath,
        logger,
      );
      if (urlResolution.error) {
        return {
          content: [{ type: 'text', text: urlResolution.error }],
          isError: true,
        };
      }
      branch = urlResolution.branch;
      cipeIdFromUrl = urlResolution.cipeId;
    } else {
      branch = params.branch ?? getCurrentGitBranch(workspacePath) ?? undefined;
      if (!branch) {
        return {
          content: [
            {
              type: 'text',
              text: 'Could not determine the current git branch. Please provide a branch name or URL explicitly.',
            },
          ],
          isError: true,
        };
      }
    }

    // Fetch CIPE data for recent branches, always include the target branch
    const cipeResult = await getRecentCIPEData(workspacePath, logger, {
      branch,
    });

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

    // Find CIPE for the branch
    const cipeForBranch = cipeResult.info?.find(
      (cipe) => cipe.branch === branch,
    );

    if (!cipeForBranch) {
      const message = `No CI pipeline execution found for branch "${branch}". This branch may not have any CI runs yet.`;
      return {
        content: [{ type: 'text', text: message }],
        structuredContent: {
          cipeStatus: null,
          cipeUrl: null,
          branch: branch ?? null,
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
          error: message,
        },
        isError: false,
      };
    }

    // Check if we retrieved a different CIPE than what was in the URL
    const retrievedDifferentCipe =
      cipeIdFromUrl && cipeForBranch.ciPipelineExecutionId !== cipeIdFromUrl;

    // Collect all failed task IDs from all runs
    const failedTaskIds: string[] = [];
    for (const runGroup of cipeForBranch.runGroups) {
      for (const run of runGroup.runs) {
        if (run.failedTasks) {
          for (const taskId of run.failedTasks) {
            // Transform record-command tasks to use the actual command for better agent understanding
            // These taskIds are internal placeholders - the real command is in run.command
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
      selfHealingSkippedReason:
        cipeForBranch.selfHealingSkipInfo?.reason ?? null,
      selfHealingSkipMessage:
        cipeForBranch.selfHealingSkipInfo?.message ?? null,
      error: null,
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
          // Prefer new API fields (remoteTaskSummary and localTaskSummary) over old taskOutputSummary
          output.remoteTaskSummary = fixResult.data.remoteTaskSummary ?? null;
          output.localTaskSummary = fixResult.data.localTaskSummary ?? null;
          // Backwards compatibility for taskOutputSummary:
          // - If new fields available, combine them
          // - Otherwise fall back to old API field
          output.taskOutputSummary =
            output.remoteTaskSummary || output.localTaskSummary
              ? [output.remoteTaskSummary, output.localTaskSummary]
                  .filter(Boolean)
                  .join('\n\n---\n\n')
              : (fixResult.data.taskOutputSummary ?? null);
          output.suggestedFixReasoning = fixResult.data.suggestedFixReasoning;
          output.suggestedFixDescription =
            fixResult.data.suggestedFixDescription;
          output.suggestedFix = fixResult.data.suggestedFix;
          output.confidence = fixResult.data.confidence;
          output.confidenceReasoning = fixResult.data.confidenceReasoning;
        }
      }
    }

    // Build disclaimer if we retrieved a different CIPE than the URL pointed to
    const retrievedDifferentCipeDisclaimer = ` The URL pointed to an older CI Pipeline Execution. Showing the most recent CI information for branch "${branch}" instead.`;
    const disclaimer = retrievedDifferentCipe
      ? `**Note:** ${retrievedDifferentCipeDisclaimer} \n\n`
      : '';

    // Build hints for structured content
    const hints: string[] = [];
    if (retrievedDifferentCipe) {
      hints.push(retrievedDifferentCipeDisclaimer);
    }
    hints.push(
      'remoteTaskSummary contains output from tasks that ran on CI machines. localTaskSummary contains output from the self-healing agent machine.',
    );
    output.hints = hints;

    // Branch based on select parameter
    if (!params.select) {
      // Overview mode - no pagination needed, returns compact overview
      const textContent = formatCIInformationOverview(output);
      return {
        content: [{ type: 'text', text: disclaimer + textContent }],
        structuredContent: output,
      };
    }

    // Parse comma-separated field names
    const fields = params.select.split(',').map((s) => s.trim());

    if (fields.length === 1) {
      // Single field - existing behavior with pagination
      const fieldName = fields[0];

      // Check if field exists as a key in output
      if (!(fieldName in output)) {
        const availableFields = Object.keys(output).join(', ');
        return {
          content: [
            {
              type: 'text',
              text: `Path "${fieldName}" not found in CI information. Available fields: ${availableFields}`,
            },
          ],
          structuredContent: output,
          isError: true,
        };
      }

      const selectedValue = getValueByPath(
        output as unknown as Record<string, unknown>,
        fieldName,
      );

      // Handle null values
      if (selectedValue === null) {
        return {
          content: [
            { type: 'text', text: `${fieldName}: null (no data available)` },
          ],
          structuredContent: output,
        };
      }

      // Handle string values with pagination
      if (typeof selectedValue === 'string') {
        const pageNumber = params.pageToken ?? 0;
        const useReversePagination =
          REVERSE_PAGINATION_FIELDS.includes(fieldName);

        const { chunk, hasMore } = useReversePagination
          ? chunkContentReverse(
              selectedValue,
              pageNumber,
              SELF_HEALING_CHUNK_SIZE,
            )
          : chunkContent(selectedValue, pageNumber, SELF_HEALING_CHUNK_SIZE);

        // Format diff content with code block
        const isDiff = fieldName === 'suggestedFix';
        const formattedChunk = isDiff ? '```diff\n' + chunk + '\n```' : chunk;

        const content: CallToolResult['content'] = [
          { type: 'text', text: formattedChunk },
        ];

        if (hasMore) {
          const paginationHint = useReversePagination
            ? 'to view older output'
            : 'to continue';
          content.push({
            type: 'text',
            text: `Next page token: ${pageNumber + 1}. Call this tool again with the next page token ${paginationHint}.`,
          });
        }

        return { content, structuredContent: output };
      }

      // Handle non-string values (arrays, objects, numbers, booleans) - return as JSON
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(selectedValue),
          },
        ],
        structuredContent: output,
      };
    }

    // Multiple fields - return object with values (truncated, no pagination)
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
      if (typeof value === 'string' && value.length > SELF_HEALING_CHUNK_SIZE) {
        // Truncate long strings, indicate more available
        const fromEnd = REVERSE_PAGINATION_FIELDS.includes(field);
        result[field] =
          truncateString(value, SELF_HEALING_CHUNK_SIZE, fromEnd) +
          `\n\n[Truncated - use select="${field}" alone for full paginated content]`;
      } else {
        result[field] = value;
      }
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
      structuredContent: output,
    };
  };

/**
 * Format CI information as a compact overview (no long content like task output or diff).
 * Used when select parameter is not provided.
 */
function formatCIInformationOverview(output: CIInformationOutput): string {
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

const handleUpdateSelfHealingFix =
  (
    workspacePath: string,
    logger: Logger,
    telemetry: NxConsoleTelemetryLogger | undefined,
  ) =>
  async (
    params: z.infer<typeof updateSelfHealingFixSchema>,
  ): Promise<CallToolResult> => {
    telemetry?.logUsage('ai.tool-call', {
      tool: UPDATE_SELF_HEALING_FIX,
    });

    let aiFixId = params.aiFixId;
    let resolvedShortLink: string | null = params.shortLink ?? null;

    // If shortLink provided, extract the aiFixId from the fix diff API
    if (!aiFixId && params.shortLink) {
      const parsed = parseShortLink(params.shortLink);
      if (!parsed) {
        const output: UpdateSelfHealingFixOutput = {
          success: false,
          message: `Invalid shortLink format: ${params.shortLink}. Expected format like "abc123-def456".`,
          aiFixId: null,
          action: params.action,
          shortLink: resolvedShortLink,
        };
        return {
          content: [{ type: 'text', text: output.message }],
          structuredContent: output,
          isError: true,
        };
      }

      const fixResult = await retrieveFixDiff(
        workspacePath,
        logger,
        parsed.fixShortLink,
        parsed.suggestionShortLink,
      );

      if (fixResult.error || !fixResult.data?.aiFixId) {
        const output: UpdateSelfHealingFixOutput = {
          success: false,
          message: `Failed to retrieve fix from shortLink: ${fixResult.error?.message ?? 'aiFixId not found'}`,
          aiFixId: null,
          action: params.action,
          shortLink: resolvedShortLink,
        };
        return {
          content: [{ type: 'text', text: output.message }],
          structuredContent: output,
          isError: true,
        };
      }

      aiFixId = fixResult.data.aiFixId;
    }

    // If neither aiFixId nor shortLink, auto-detect from branch
    if (!aiFixId) {
      const branch = params.branch ?? getCurrentGitBranch(workspacePath);
      if (!branch) {
        const output: UpdateSelfHealingFixOutput = {
          success: false,
          message:
            'Could not determine the current git branch. Please provide aiFixId, shortLink, or branch explicitly.',
          aiFixId: null,
          action: params.action,
          shortLink: null,
        };
        return {
          content: [{ type: 'text', text: output.message }],
          structuredContent: output,
          isError: true,
        };
      }

      const cipeResult = await getRecentCIPEData(workspacePath, logger, {
        branch,
      });
      if (cipeResult.error) {
        const output: UpdateSelfHealingFixOutput = {
          success: false,
          message: `Failed to retrieve CI information: ${cipeResult.error.message}`,
          aiFixId: null,
          action: params.action,
          shortLink: null,
        };
        return {
          content: [{ type: 'text', text: output.message }],
          structuredContent: output,
          isError: true,
        };
      }

      const cipeForBranch = cipeResult.info?.find(
        (cipe) => cipe.branch === branch,
      );

      if (!cipeForBranch) {
        const output: UpdateSelfHealingFixOutput = {
          success: false,
          message: `No CI pipeline execution found for branch "${branch}".`,
          aiFixId: null,
          action: params.action,
          shortLink: null,
        };
        return {
          content: [{ type: 'text', text: output.message }],
          structuredContent: output,
          isError: true,
        };
      }

      // Find the most recent AI fix
      let aiFix: NxAiFix | undefined;
      for (const runGroup of cipeForBranch.runGroups) {
        if (runGroup.aiFix?.aiFixId) {
          aiFix = runGroup.aiFix;
          break;
        }
      }

      if (!aiFix?.aiFixId) {
        const output: UpdateSelfHealingFixOutput = {
          success: false,
          message: `No AI fix found for branch "${branch}".`,
          aiFixId: null,
          action: params.action,
          shortLink: null,
        };
        return {
          content: [{ type: 'text', text: output.message }],
          structuredContent: output,
          isError: true,
        };
      }

      aiFixId = aiFix.aiFixId;
      resolvedShortLink = aiFix.shortLink ?? null;
    }

    // Map APPLY/REJECT/RERUN_ENVIRONMENT_STATE to APPLIED/REJECTED/RERUN_REQUESTED
    const action =
      params.action === 'APPLY'
        ? 'APPLIED'
        : params.action === 'RERUN_ENVIRONMENT_STATE'
          ? 'RERUN_REQUESTED'
          : 'REJECTED';

    const result = await updateSuggestedFix({
      workspacePath,
      logger,
      aiFixId,
      action,
      actionOrigin: 'NX_CLI',
    });

    if (!result.success) {
      const output: UpdateSelfHealingFixOutput = {
        success: false,
        message: `Failed to ${params.action.toLowerCase()} fix: ${result.error?.message ?? 'Unknown error'}`,
        aiFixId,
        action: params.action,
        shortLink: resolvedShortLink,
      };
      return {
        content: [{ type: 'text', text: output.message }],
        structuredContent: output,
        isError: true,
      };
    }

    const actionVerb =
      params.action === 'APPLY'
        ? 'applied'
        : params.action === 'RERUN_ENVIRONMENT_STATE'
          ? 'requested rerun for'
          : 'rejected';
    const hints: string[] = [];
    if (resolvedShortLink && params.action !== 'APPLY') {
      hints.push(
        `Use the shortLink '${resolvedShortLink}' to apply this fix via the update_self_healing_fix tool.`,
      );
    }
    const output: UpdateSelfHealingFixOutput = {
      success: true,
      message: `Successfully ${actionVerb} the fix (aiFixId: ${aiFixId}).`,
      aiFixId,
      action: params.action,
      shortLink: resolvedShortLink,
      ...(hints.length > 0 ? { hints } : {}),
    };
    return {
      content: [{ type: 'text', text: output.message }],
      structuredContent: output,
    };
  };

// Exported for testing
export const __testing__ = {
  parseShortLink,
  formatCIInformationOverview,
  chunkContentReverse,
};
