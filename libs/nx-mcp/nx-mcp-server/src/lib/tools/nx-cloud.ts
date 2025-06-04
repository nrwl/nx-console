import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '@nx-console/shared-utils';
import {
  getNxCloudTerminalOutput,
  getRecentCIPEData,
  getPipelineExecutionsSearch,
  getPipelineExecutionDetails,
} from '@nx-console/shared-nx-cloud';
import { z } from 'zod';
import {
  NX_CLOUD_CIPE_DETAILS,
  NX_CLOUD_CIPE_FAILURE,
  NX_CLOUD_PIPELINE_EXECUTIONS_SEARCH,
  NX_CLOUD_PIPELINE_EXECUTIONS_DETAILS,
} from '@nx-console/shared-llm-context/src/lib/tool-names';

export function registerNxCloudTools(
  workspacePath: string,
  server: McpServer,
  logger: Logger,
  telemetry?: NxConsoleTelemetryLogger,
  getGitDiffs?: (
    workspacePath: string,
    baseSha?: string,
    headSha?: string,
  ) => Promise<{ path: string; diffContent: string }[] | null>,
) {
  server.tool(
    NX_CLOUD_CIPE_DETAILS,
    'Returns a list of CIPE (CI pipeline execution) details for the current workspace and branch from Nx Cloud. This includes the status, and execution ID or link ID. If there are failed tasks, it will also include the task ID. If this returns text that contains "canceled", that means that there were no failures, and additional help and details are not needed.',
    {
      destructiveHint: false,
      readOnlyHint: true,
      openWorldHint: true,
    },
    nxCloudCipeDetails(workspacePath, logger, telemetry),
  );
  server.tool(
    NX_CLOUD_CIPE_FAILURE,
    'Returns details about the failure of a CI pipeline execution. When given a execution ID or link ID and a task ID, the terminal output and affected git files will be returned.',
    nxCloudFixCipeSchema.shape,
    {
      destructiveHint: false,
      readOnlyHint: true,
      openWorldHint: true,
    },
    nxCloudCipeAffectedFilesAndTerminalOutput(
      workspacePath,
      logger,
      telemetry,
      getGitDiffs ?? (async () => null),
    ),
  );

  // Pipeline Executions Search
  server.tool(
    NX_CLOUD_PIPELINE_EXECUTIONS_SEARCH,
    'Search for pipeline executions in Nx Cloud. Returns a list of pipeline executions matching the search criteria.',
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
    'Get detailed information about a specific pipeline execution in Nx Cloud.',
    pipelineExecutionDetailsSchema.shape,
    {
      destructiveHint: false,
      readOnlyHint: true,
      openWorldHint: true,
    },
    nxCloudPipelineExecutionDetails(workspacePath, logger, telemetry),
  );
}

const nxCloudCipeDetails =
  (
    workspacePath: string,
    logger: Logger,
    telemetry: NxConsoleTelemetryLogger | undefined,
  ) =>
  async () => {
    telemetry?.logUsage('ai.tool-call', {
      tool: 'nx_cloud_cipe_details',
    });

    const recentData = await getRecentCIPEData(workspacePath, logger);

    if (recentData.error) {
      throw new Error(
        `Error getting recent CIPE data: ${recentData.error.message}`,
      );
    }

    const content: CallToolResult['content'] = [];

    content.push({
      type: 'text',
      text: `Nx Cloud Workspace Url: ${recentData.workspaceUrl}`,
    });

    if (recentData.info && recentData.info.length > 0) {
      content.push({
        type: 'text',
        text: `Recent CI Pipeline Executions:`,
      });
      for (const info of recentData.info) {
        content.push({
          type: 'text',
          text: `- ${info.cipeUrl} (CIPE Status: ${info.status})`,
        });
        for (const runGroup of info.runGroups) {
          content.push({
            type: 'text',
            text: `  -- Run Group: ${runGroup.runGroup} (Run Group Status: ${runGroup.status})`,
          });
          for (const run of runGroup.runs) {
            let runPrompt = '    --- Run';
            if (run.executionId) {
              runPrompt += ` Execution ID: ${run.executionId}`;
            }
            if (run.linkId) {
              runPrompt += ` Link ID: ${run.linkId}`;
            }

            runPrompt += ` (Run Status: ${run.status})`;

            content.push({
              type: 'text',
              text: runPrompt,
            });
            for (const task of run.failedTasks ?? []) {
              content.push({
                type: 'text',
                text: `      ---- Failed Task: ${task}`,
              });
            }
            if (run.status === 'CANCELED') {
              content.push({
                type: 'text',
                text: `      ---- Note: This run was canceled, indicating no failures occurred.`,
              });
            }
          }
        }
      }
    } else {
      content.push({
        type: 'text',
        text: `No recent CI pipeline executions found. This means that there were no recent runs in the last hour, or there are no runs on the current git branch`,
      });
    }

    return {
      content,
    } satisfies CallToolResult;
  };

const nxCloudFixCipeSchema = z.object({
  executionId: z
    .string()
    .optional()
    .describe('The execution ID of the run in the CI pipeline execution'),
  linkId: z
    .string()
    .optional()
    .describe('The link ID of the run in the CI pipeline execution'),
  taskId: z
    .string()
    .describe(
      'The task ID of the failed task, which is a nx task that was executed',
    ),
});

type NxCloudFixCipeParams = z.infer<typeof nxCloudFixCipeSchema>;
const nxCloudCipeAffectedFilesAndTerminalOutput =
  (
    workspacePath: string,
    logger: Logger,
    telemetry: NxConsoleTelemetryLogger | undefined,
    getGitDiffs: (
      workspacePath: string,
      baseSha?: string,
      headSha?: string,
    ) => Promise<{ path: string; diffContent: string }[] | null>,
  ) =>
  async (params: NxCloudFixCipeParams): Promise<CallToolResult> => {
    telemetry?.logUsage('ai.tool-call', {
      tool: 'nx_cloud_fix_cipe_failure',
    });

    if (!params.executionId && !params.linkId) {
      throw new Error('Execution ID or link ID is required');
    }

    const content: CallToolResult['content'] = [];

    const terminalOutput = await getNxCloudTerminalOutput(
      {
        taskId: params.taskId,
        ciPipelineExecutionId: params.executionId,
        linkId: params.linkId,
      },
      workspacePath,
      logger,
    );

    if (terminalOutput.error) {
      throw new Error(terminalOutput.error);
    }
    content.push({
      type: 'text',
      text: `Terminal Output: ${terminalOutput.terminalOutput}`,
    });

    try {
      const changedFiles = await getGitDiffs?.(workspacePath);
      if (changedFiles) {
        for (const file of changedFiles) {
          content.push({
            type: 'text',
            text: `Changed File: ${file.path}`,
          });
          content.push({
            type: 'text',
            text: `Diff: ${file.diffContent}`,
          });
        }
      }
    } catch (e) {
      logger.log(`Error getting git diffs: ${e}`);
      content.push({
        type: 'text',
        text: 'Unable to get git diffs',
      });
    }

    return { content };
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
    .describe('Filter by execution statuses'),
  authors: z.array(z.string()).optional().describe('Filter by commit authors'),
  repositoryUrl: z.string().optional().describe('Filter by repository URL'),
  minCreatedAtMs: z
    .number()
    .optional()
    .describe('Minimum creation timestamp in milliseconds'),
  maxCreatedAtMs: z
    .number()
    .optional()
    .describe('Maximum creation timestamp in milliseconds'),
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
  statuses: z.array(z.string()).optional().describe('Filter by run statuses'),
  minStartTimeMs: z
    .number()
    .optional()
    .describe('Minimum start time in milliseconds'),
  maxStartTimeMs: z
    .number()
    .optional()
    .describe('Maximum start time in milliseconds'),
  commandContains: z
    .string()
    .optional()
    .describe('Filter by command containing this text'),
  urlSlug: z.string().optional().describe('Filter by specific URL slug'),
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
  runIds: z.array(z.string()).optional().describe('Filter by specific run IDs'),
  pipelineExecutionIds: z
    .array(z.string())
    .optional()
    .describe('Filter by pipeline execution IDs'),
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
  hashes: z.array(z.string()).optional().describe('Filter by task hashes'),
  statuses: z.array(z.string()).optional().describe('Filter by task statuses'),
  cacheStatuses: z
    .array(z.string())
    .optional()
    .describe('Filter by cache statuses'),
  minStartTimeMs: z
    .number()
    .optional()
    .describe('Minimum start time in milliseconds'),
  maxStartTimeMs: z
    .number()
    .optional()
    .describe('Maximum start time in milliseconds'),
  limit: z
    .number()
    .optional()
    .default(100)
    .describe('Maximum number of results to return'),
  pageToken: z.string().optional().describe('Token for pagination'),
});

const taskDetailsSchema = z.object({
  runId: z.string().describe('The ID of the run containing the task'),
  encodedTaskId: z.string().describe('The URL-encoded task ID to retrieve'),
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
      params as any,
    );

    if (result.error) {
      throw new Error(
        `Error searching pipeline executions: ${result.error.message}`,
      );
    }

    const content: CallToolResult['content'] = [];

    if (result.data?.items && result.data.items.length > 0) {
      content.push({
        type: 'text',
        text: `Found ${result.data.items.length} pipeline executions:`,
      });

      for (const execution of result.data.items) {
        content.push({
          type: 'text',
          text: `- Pipeline Execution ID: ${execution.id}`,
        });
        content.push({
          type: 'text',
          text: `  Branch: ${execution.branch}, Status: ${execution.status}`,
        });
        content.push({
          type: 'text',
          text: `  Created: ${new Date(execution.createdAtMs).toISOString()}`,
        });
        if (execution.vcsTitle) {
          content.push({
            type: 'text',
            text: `  Title: ${execution.vcsTitle}`,
          });
        }
        if (execution.author) {
          content.push({
            type: 'text',
            text: `  Author: ${execution.author}`,
          });
        }
      }

      if (result.data.nextPageToken) {
        content.push({
          type: 'text',
          text: `Next page token: ${result.data.nextPageToken}`,
        });
      }
    } else {
      content.push({
        type: 'text',
        text: 'No pipeline executions found matching the criteria.',
      });
    }

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

    const content: CallToolResult['content'] = [];
    const execution = result.data!;

    content.push({
      type: 'text',
      text: `Pipeline Execution Details for ID: ${execution.id}`,
    });
    content.push({
      type: 'text',
      text: `Branch: ${execution.branch}, Status: ${execution.status}`,
    });
    content.push({
      type: 'text',
      text: `Created: ${new Date(execution.createdAtMs).toISOString()}`,
    });
    if (execution.completedAtMs) {
      content.push({
        type: 'text',
        text: `Completed: ${new Date(execution.completedAtMs).toISOString()}`,
      });
    }
    if (execution.durationMs) {
      content.push({
        type: 'text',
        text: `Duration: ${Math.round(execution.durationMs / 1000)}s`,
      });
    }

    content.push({
      type: 'text',
      text: `Run Groups (${execution.runGroups.length}):`,
    });
    for (const runGroup of execution.runGroups) {
      content.push({
        type: 'text',
        text: `- ${runGroup.runGroupName}: ${runGroup.status}`,
      });
    }

    return { content };
  };

// In Progress
// const nxCloudRunsSearch =
//   (
//     workspacePath: string,
//     logger: Logger,
//     telemetry: NxConsoleTelemetryLogger | undefined,
//   ) =>
//   async (params: z.infer<typeof runSearchSchema>): Promise<CallToolResult> => {
//     telemetry?.logUsage('ai.tool-call', {
//       tool: NX_CLOUD_RUNS_SEARCH,
//     });
//
//     const result = await getRunsSearch(workspacePath, logger, params as any);
//
//     if (result.error) {
//       throw new Error(`Error searching runs: ${result.error.message}`);
//     }
//
//     const content: CallToolResult['content'] = [];
//
//     if (result.data?.items && result.data.items.length > 0) {
//       content.push({
//         type: 'text',
//         text: `Found ${result.data.items.length} runs:`,
//       });
//
//       for (const run of result.data.items) {
//         content.push({
//           type: 'text',
//           text: `- Run ID: ${run.id}`,
//         });
//         content.push({
//           type: 'text',
//           text: `  Command: ${run.command}`,
//         });
//         content.push({
//           type: 'text',
//           text: `  Status: ${run.status}, Tasks: ${run.taskCount}`,
//         });
//         content.push({
//           type: 'text',
//           text: `  Duration: ${Math.round(run.durationMs / 1000)}s`,
//         });
//         if (run.branch) {
//           content.push({
//             type: 'text',
//             text: `  Branch: ${run.branch}`,
//           });
//         }
//       }
//
//       if (result.data.nextPageToken) {
//         content.push({
//           type: 'text',
//           text: `Next page token: ${result.data.nextPageToken}`,
//         });
//       }
//     } else {
//       content.push({
//         type: 'text',
//         text: 'No runs found matching the criteria.',
//       });
//     }
//
//     return { content };
//   };
//
// const nxCloudRunDetails =
//   (
//     workspacePath: string,
//     logger: Logger,
//     telemetry: NxConsoleTelemetryLogger | undefined,
//   ) =>
//   async (params: z.infer<typeof runDetailsSchema>): Promise<CallToolResult> => {
//     telemetry?.logUsage('ai.tool-call', {
//       tool: NX_CLOUD_RUNS_DETAILS,
//     });
//
//     const result = await getRunDetails(workspacePath, logger, params.runId);
//
//     if (result.error) {
//       throw new Error(`Error getting run details: ${result.error.message}`);
//     }
//
//     const content: CallToolResult['content'] = [];
//     const run = result.data!;
//
//     content.push({
//       type: 'text',
//       text: `Run Details for ID: ${run.id}`,
//     });
//     content.push({
//       type: 'text',
//       text: `Command: ${run.command}`,
//     });
//     content.push({
//       type: 'text',
//       text: `Status: ${run.status}, Task Count: ${run.taskCount}`,
//     });
//     content.push({
//       type: 'text',
//       text: `Duration: ${Math.round(run.durationMs / 1000)}s`,
//     });
//     content.push({
//       type: 'text',
//       text: `Started: ${new Date(run.startTimeMs).toISOString()}`,
//     });
//
//     if (run.tasks && run.tasks.length > 0) {
//       content.push({
//         type: 'text',
//         text: `Tasks (${run.tasks.length}):`,
//       });
//       for (const task of run.tasks.slice(0, 10)) {
//         // Limit to first 10 tasks
//         content.push({
//           type: 'text',
//           text: `- ${task.projectName}:${task.target} (${task.status}) - ${Math.round(task.durationMs / 1000)}s`,
//         });
//       }
//       if (run.tasks.length > 10) {
//         content.push({
//           type: 'text',
//           text: `... and ${run.tasks.length - 10} more tasks`,
//         });
//       }
//     }
//
//     return { content };
//   };
//
// const nxCloudTasksSearch =
//   (
//     workspacePath: string,
//     logger: Logger,
//     telemetry: NxConsoleTelemetryLogger | undefined,
//   ) =>
//   async (params: z.infer<typeof taskSearchSchema>): Promise<CallToolResult> => {
//     telemetry?.logUsage('ai.tool-call', {
//       tool: NX_CLOUD_TASKS_SEARCH,
//     });
//
//     const result = await getTasksSearch(workspacePath, logger, params as any);
//
//     if (result.error) {
//       throw new Error(`Error searching tasks: ${result.error.message}`);
//     }
//
//     const content: CallToolResult['content'] = [];
//
//     if (result.data?.items && result.data.items.length > 0) {
//       content.push({
//         type: 'text',
//         text: `Found ${result.data.items.length} tasks:`,
//       });
//
//       for (const task of result.data.items) {
//         content.push({
//           type: 'text',
//           text: `- Task ID: ${task.taskId}`,
//         });
//         content.push({
//           type: 'text',
//           text: `  Project: ${task.projectName}, Target: ${task.target}`,
//         });
//         content.push({
//           type: 'text',
//           text: `  Status: ${task.status}, Cache: ${task.cacheStatus}`,
//         });
//         content.push({
//           type: 'text',
//           text: `  Duration: ${Math.round(task.durationMs / 1000)}s`,
//         });
//         if (task.runId) {
//           content.push({
//             type: 'text',
//             text: `  Run ID: ${task.runId}`,
//           });
//         }
//       }
//
//       if (result.data.nextPageToken) {
//         content.push({
//           type: 'text',
//           text: `Next page token: ${result.data.nextPageToken}`,
//         });
//       }
//     } else {
//       content.push({
//         type: 'text',
//         text: 'No tasks found matching the criteria.',
//       });
//     }
//
//     return { content };
//   };
//
// const nxCloudTaskDetails =
//   (
//     workspacePath: string,
//     logger: Logger,
//     telemetry: NxConsoleTelemetryLogger | undefined,
//   ) =>
//   async (
//     params: z.infer<typeof taskDetailsSchema>,
//   ): Promise<CallToolResult> => {
//     telemetry?.logUsage('ai.tool-call', {
//       tool: NX_CLOUD_TASKS_DETAILS,
//     });
//
//     const result = await getTaskDetails(
//       workspacePath,
//       logger,
//       params.runId,
//       params.encodedTaskId,
//     );
//
//     if (result.error) {
//       throw new Error(`Error getting task details: ${result.error.message}`);
//     }
//
//     const content: CallToolResult['content'] = [];
//     const task = result.data!;
//
//     content.push({
//       type: 'text',
//       text: `Task Details for ID: ${task.taskId}`,
//     });
//     content.push({
//       type: 'text',
//       text: `Project: ${task.projectName}, Target: ${task.target}`,
//     });
//     content.push({
//       type: 'text',
//       text: `Status: ${task.status}, Cache Status: ${task.cacheStatus}`,
//     });
//     content.push({
//       type: 'text',
//       text: `Duration: ${Math.round(task.durationMs / 1000)}s`,
//     });
//     content.push({
//       type: 'text',
//       text: `Hash: ${task.hash}`,
//     });
//     content.push({
//       type: 'text',
//       text: `Cacheable: ${task.isCacheable}`,
//     });
//     if (task.params) {
//       content.push({
//         type: 'text',
//         text: `Parameters: ${task.params}`,
//       });
//     }
//     if (task.priorAttempts && task.priorAttempts.length > 0) {
//       content.push({
//         type: 'text',
//         text: `Prior Attempts: ${task.priorAttempts.length}`,
//       });
//     }
//
//     return { content };
//   };
