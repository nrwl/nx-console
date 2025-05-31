import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '@nx-console/shared-utils';
import {
  getNxCloudTerminalOutput,
  getRecentCIPEData,
} from '@nx-console/shared-nx-cloud';
import { z } from 'zod';
import {
  NX_CLOUD_CIPE_DETAILS,
  NX_CLOUD_CIPE_FAILURE,
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
