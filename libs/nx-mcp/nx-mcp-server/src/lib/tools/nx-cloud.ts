import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '@nx-console/shared-utils';
import {
  getNxCloudTerminalOutput,
  getRecentCIPEData,
} from '@nx-console/shared-nx-cloud';
import { z } from 'zod';

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
    'nx_cloud_cipe_details',
    'Returns a list of CIPE (CI pipeline execution) details for the current workspace and branch from Nx Cloud. This includes the status, and execution ID or link ID. If there are failed tasks, it will also include the task ID.',
    nxCloudCipeDetails(workspacePath, logger, telemetry),
  );
  server.tool(
    'nx_cloud_fix_cipe_failure',
    'Returns details about the failure of a CI pipeline execution. When given a execution ID or link ID and a task ID, the terminal output and affected git files will be returned.',
    nxCloudFixCipeSchema.shape,
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

    if (recentData.info) {
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
            content.push({
              type: 'text',
              text: `    --- Run LinkId: ${run.executionId ?? run.linkId} (Run Status: ${run.status})`,
            });
            for (const task of run.failedTasks ?? []) {
              content.push({
                type: 'text',
                text: `      ---- Failed Task: ${task}`,
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
    .describe('The execution ID of the CI pipeline execution'),
  linkId: z
    .string()
    .optional()
    .describe('The link ID of the CI pipeline execution'),
  taskId: z.string().describe('The task ID of the failed task'),
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

    const changedFiles = await getGitDiffs(
      workspacePath,
      params.executionId,
      params.linkId,
    );
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

    return { content };
  };
