import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  CLOUD_ANALYTICS_PIPELINE_EXECUTION_DETAILS,
  CLOUD_ANALYTICS_PIPELINE_EXECUTIONS_SEARCH,
  CLOUD_ANALYTICS_RUN_DETAILS,
  CLOUD_ANALYTICS_RUNS_SEARCH,
  CLOUD_ANALYTICS_TASK_EXECUTIONS_SEARCH,
  CLOUD_ANALYTICS_TASKS_SEARCH,
  GET_SELF_HEALING_CONTEXT,
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
  RetrieveFixDiffResponse,
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
  SelfHealingContextOutput,
  selfHealingContextOutputSchema,
} from './output-schemas';

const SELF_HEALING_CHUNK_SIZE = 10000;

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

  if (!isToolEnabled(GET_SELF_HEALING_CONTEXT, toolsFilter)) {
    logger.debug?.(
      `Skipping ${GET_SELF_HEALING_CONTEXT} - disabled by tools filter`,
    );
  } else {
    registry.registerTool({
      name: GET_SELF_HEALING_CONTEXT,
      description:
        'Retrieve self-healing CI context from Nx Cloud for the current branch. Returns information about failed tasks, error summaries, and AI-generated fix suggestions when available. Use this tool when helping users debug CI failures or apply suggested fixes.',
      inputSchema: getSelfHealingContextSchema.shape,
      outputSchema: selfHealingContextOutputSchema,
      annotations: {
        destructiveHint: false,
        readOnlyHint: true,
        openWorldHint: true,
      },
      handler: async (args) =>
        getSelfHealingContext(
          workspacePath,
          logger,
          telemetry,
        )(args as z.infer<typeof getSelfHealingContextSchema>),
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

const getSelfHealingContextSchema = z.object({
  branch: z
    .string()
    .optional()
    .describe('Branch name to query. Defaults to current git branch.'),
  shortLink: z
    .string()
    .optional()
    .describe(
      'Direct shortlink to retrieve specific fix context (format: fixShortLink-suggestionShortLink). This is entirely optional and should only be used if the user provided a specific shortlink. Otherwise using branches to find fixes is perfectly fine.',
    ),
  pageToken: z
    .number()
    .optional()
    .describe(
      'Token for pagination of text content (0-based page number). ' +
        'Note: structuredContent is not paginated. ' +
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

function formatSelfHealingContextMarkdown(
  data: RetrieveFixDiffResponse,
): string {
  const lines: string[] = [];

  lines.push('## Self-Healing CI Fix Context');
  lines.push('');

  // Status
  lines.push('### Status');
  const statusText =
    data.suggestedFixStatus === 'COMPLETED'
      ? 'Fix available'
      : data.suggestedFixStatus === 'IN_PROGRESS'
        ? 'Fix is being generated'
        : data.suggestedFixStatus === 'FAILED'
          ? 'Fix generation failed'
          : data.suggestedFixStatus;
  lines.push(statusText);
  lines.push('');

  // PR Context
  if (data.prTitle || data.prBody) {
    lines.push('### PR Context');
    if (data.prTitle) {
      lines.push(`**Title:** ${data.prTitle}`);
    }
    if (data.prBody) {
      lines.push(`**Description:** ${data.prBody}`);
    }
    lines.push('');
  }

  // Failed Tasks
  if (data.taskIds && data.taskIds.length > 0) {
    lines.push('### Failed Tasks');
    lines.push(data.taskIds.join(', '));
    lines.push('');
  }

  // Error Summary
  if (data.taskOutputSummary) {
    lines.push('### Error Summary');
    lines.push(data.taskOutputSummary);
    lines.push('');
  }

  // Suggested Fix
  if (
    data.suggestedFix ||
    data.suggestedFixDescription ||
    data.suggestedFixReasoning
  ) {
    lines.push('### Suggested Fix');
    lines.push(`**Status:** ${data.suggestedFixStatus}`);
    if (data.suggestedFixDescription) {
      lines.push(`**Description:** ${data.suggestedFixDescription}`);
    }
    if (data.suggestedFixReasoning) {
      lines.push(`**Reasoning:** ${data.suggestedFixReasoning}`);
    }
    lines.push('');

    if (data.suggestedFix) {
      lines.push('### Patch');
      lines.push('```diff');
      lines.push(data.suggestedFix);
      lines.push('```');
      lines.push('');
    }
  }

  // How to Apply
  if (data.shortLink) {
    lines.push('### How to Apply');
    lines.push('');
    lines.push('To apply this fix locally, run:');
    lines.push('```bash');
    lines.push(`npx nx-cloud apply-locally ${data.shortLink}`);
    lines.push('```');
    lines.push('');
    lines.push(
      'Review the changes after applying - the fix may need adjustments for your specific situation.',
    );
    lines.push('');
  }

  // Git Context
  if (data.branch || data.commitSha) {
    lines.push('### Git Context');
    if (data.branch) {
      lines.push(`- **Branch:** ${data.branch}`);
    }
    if (data.commitSha) {
      lines.push(`- **Base Commit:** ${data.commitSha}`);
    }
  }

  return lines.join('\n');
}

async function fetchAndFormatFixContext(
  workspacePath: string,
  logger: Logger,
  shortLink: string,
  pageToken?: number,
): Promise<CallToolResult> {
  const parsed = parseShortLink(shortLink);
  if (!parsed) {
    return {
      content: [
        {
          type: 'text',
          text: `Invalid shortlink format: "${shortLink}". Expected format: "fixShortLink-suggestionShortLink" (e.g., "abc123-def456")`,
        },
      ],
      isError: true,
    };
  }

  const result = await retrieveFixDiff(
    workspacePath,
    logger,
    parsed.fixShortLink,
    parsed.suggestionShortLink,
  );

  if (result.error) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to retrieve self-healing context: ${result.error.message}. Please check your Nx Cloud connection and authentication.`,
        },
      ],
      isError: result.error.type !== 'not_found',
    };
  }

  const markdownContent = formatSelfHealingContextMarkdown({
    ...result.data!,
    shortLink,
  });

  // Apply pagination to text content
  const pageNumber = pageToken ?? 0;
  const { chunk, hasMore } = chunkContent(
    markdownContent,
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

  const structuredContent: SelfHealingContextOutput = {
    ...result.data!,
    shortLink,
  };

  return { content, structuredContent };
}

const getSelfHealingContext =
  (
    workspacePath: string,
    logger: Logger,
    telemetry: NxConsoleTelemetryLogger | undefined,
  ) =>
  async (
    params: z.infer<typeof getSelfHealingContextSchema>,
  ): Promise<CallToolResult> => {
    telemetry?.logUsage('ai.tool-call', {
      tool: GET_SELF_HEALING_CONTEXT,
    });

    // If shortLink is provided, fetch fix context directly
    if (params.shortLink) {
      return fetchAndFormatFixContext(
        workspacePath,
        logger,
        params.shortLink,
        params.pageToken,
      );
    }

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
            text: `Failed to retrieve self-healing context: ${cipeResult.error.message}. Please check your Nx Cloud connection and authentication.`,
          },
        ],
        isError: true,
      };
    }

    // Find CIPE for the specified branch
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

    // Find AI fix from run groups
    let aiFix: NxAiFix | undefined;
    for (const runGroup of cipeForBranch.runGroups) {
      if (runGroup.aiFix) {
        aiFix = runGroup.aiFix;
        break;
      }
    }

    // Check if self-healing is enabled
    const selfHealingEnabled = cipeForBranch.aiFixesEnabled ?? false;

    if (!aiFix) {
      if (!selfHealingEnabled) {
        return {
          content: [
            {
              type: 'text',
              text: 'Self-healing CI is not enabled for this workspace. To enable self-healing CI and get AI-generated fix suggestions for failing tasks, see https://nx.dev/docs/features/ci-features/self-healing-ci#enable-self-healing-ci. Once enabled, Nx Cloud will automatically analyze failures and suggest fixes.',
            },
          ],
          isError: false,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `CI pipeline found for branch "${branch}" with self-healing enabled, but no fix context is available. This could mean:
- No tasks failed in the most recent CI run
- The failure type is not supported by self-healing`,
          },
        ],
        isError: false,
      };
    }

    // Check if fix is still generating
    if (!aiFix.shortLink) {
      if (
        aiFix.suggestedFixStatus === 'IN_PROGRESS' ||
        aiFix.suggestedFixStatus === 'NOT_STARTED'
      ) {
        return {
          content: [
            {
              type: 'text',
              text: `Self-healing fix is still being generated for branch "${branch}". Please wait a moment and try again.`,
            },
          ],
          isError: false,
        };
      }

      // Fix failed or not executable
      return {
        content: [
          {
            type: 'text',
            text: `Self-healing analysis completed for branch "${branch}" but no fix was generated. Status: ${aiFix.suggestedFixStatus}`,
          },
        ],
        isError: false,
      };
    }

    // Fetch fix context using shortLink from CIPE data
    return fetchAndFormatFixContext(
      workspacePath,
      logger,
      aiFix.shortLink,
      params.pageToken,
    );
  };
