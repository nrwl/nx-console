import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  NX_CLOUD_PIPELINE_EXECUTIONS_DETAILS,
  NX_CLOUD_PIPELINE_EXECUTIONS_SEARCH,
  NX_CLOUD_RUNS_DETAILS,
  NX_CLOUD_RUNS_SEARCH,
  NX_CLOUD_TASKS_DETAILS,
  NX_CLOUD_TASKS_SEARCH,
} from '@nx-console/shared-llm-context/src/lib/tool-names';
import {
  formatPipelineExecutionDetailsContent,
  formatPipelineExecutionsSearchContent,
  formatRunDetailsContent,
  formatRunsSearchContent,
  formatTasksDetailsSearchContent,
  formatTasksSearchContent,
  getPipelineExecutionDetails,
  getPipelineExecutionsSearch,
  getRecentCIPEData,
  getRunDetails,
  getRunsSearch,
  getTasksDetailsSearch,
  getTasksSearch,
} from '@nx-console/shared-nx-cloud';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { CIPEInfo } from '@nx-console/shared-types';
import { Logger } from '@nx-console/shared-utils';
import { z } from 'zod';

export function registerNxCloudTools(
  workspacePath: string,
  server: McpServer,
  logger: Logger,
  telemetry?: NxConsoleTelemetryLogger,
): void {
  // Pipeline Executions Search
  server.tool(
    NX_CLOUD_PIPELINE_EXECUTIONS_SEARCH,
    'Search for pipeline executions in Nx Cloud. Pipeline executions are the top-level CI/CD workflow containers that contain zero-to-many runs. Use this to find executions by branch, status, author, or time range. Each execution represents a complete CI/CD pipeline run triggered by commits or other events. If a pagination token is returned, call this tool again with the token to retrieve additional results and ensure all data is collected.',
    pipelineExecutionSearchSchema.shape,
    {
      destructiveHint: false,
      readOnlyHint: true,
      openWorldHint: true,
    },
    nxCloudPipelineExecutionsSearch(workspacePath, logger, telemetry),
  );

  // Pipeline Execution Details
  server.tool(
    NX_CLOUD_PIPELINE_EXECUTIONS_DETAILS,
    'Get detailed information about a specific pipeline execution in Nx Cloud. Pipeline executions are the top-level containers that include run groups and their associated runs. Use this to understand the structure and status of a complete CI/CD pipeline execution, including all its child runs.',
    pipelineExecutionDetailsSchema.shape,
    {
      destructiveHint: false,
      readOnlyHint: true,
      openWorldHint: true,
    },
    nxCloudPipelineExecutionDetails(workspacePath, logger, telemetry),
  );

  // Runs Search
  server.tool(
    NX_CLOUD_RUNS_SEARCH,
    'Search for runs in Nx Cloud. Runs are mid-level containers within pipeline executions that contain zero-to-many tasks. Each run represents execution of a specific command (like "nx affected:build"). Use this to find runs by pipeline execution, branch, command, or status. Runs belong to pipeline executions and contain individual tasks. If a pagination token is returned, call this tool again with the token to retrieve additional results and ensure all data is collected.',
    runSearchSchema.shape,
    {
      destructiveHint: false,
      readOnlyHint: true,
      openWorldHint: true,
    },
    nxCloudRunsSearch(workspacePath, logger, telemetry),
  );

  // Run Details
  server.tool(
    NX_CLOUD_RUNS_DETAILS,
    'Get detailed information about a specific run in Nx Cloud. Runs sit between pipeline executions and tasks in the hierarchy. Use this to see the command executed, duration, status, and all tasks that were part of this run. Each run contains zero-to-many individual tasks.',
    runDetailsSchema.shape,
    {
      destructiveHint: false,
      readOnlyHint: true,
      openWorldHint: true,
    },
    nxCloudRunDetails(workspacePath, logger, telemetry),
  );

  // Tasks Search
  server.tool(
    NX_CLOUD_TASKS_SEARCH,
    'Search for task statistics in Nx Cloud. Returns aggregated statistics for tasks including success rates, cache hit rates, and average durations. Use this to analyze performance patterns across multiple executions of the same task (project + target combination). If a pagination token is returned, call this tool again with the token to retrieve additional results and ensure all data is collected.',
    taskSearchSchema.shape,
    {
      destructiveHint: false,
      readOnlyHint: true,
      openWorldHint: true,
    },
    nxCloudTasksSearch(workspacePath, logger, telemetry),
  );

  // Task Details
  server.tool(
    NX_CLOUD_TASKS_DETAILS,
    'Search for detailed task execution information in Nx Cloud. Returns individual task execution details including project, target, duration, cache status, and parameters. Use filters to find specific task executions. If a pagination token is returned, call this tool again with the token to retrieve additional results and ensure all data is collected.',
    taskDetailsSchema.shape,
    {
      destructiveHint: false,
      readOnlyHint: true,
      openWorldHint: true,
    },
    nxCloudTaskDetails(workspacePath, logger, telemetry),
  );

  logger.log('Registered Nx Cloud tools');
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
      tool: NX_CLOUD_PIPELINE_EXECUTIONS_SEARCH,
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
      tool: NX_CLOUD_PIPELINE_EXECUTIONS_DETAILS,
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
      tool: NX_CLOUD_RUNS_SEARCH,
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
      tool: NX_CLOUD_RUNS_DETAILS,
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
      tool: NX_CLOUD_TASKS_SEARCH,
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
      tool: NX_CLOUD_TASKS_DETAILS,
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
