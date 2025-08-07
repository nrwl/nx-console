import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { Logger } from '@nx-console/shared-utils';

import z from 'zod';
import {
  NX_CURRENT_RUNNING_TASK_OUTPUT,
  NX_CURRENT_RUNNING_TASKS_DETAILS,
} from '@nx-console/shared-llm-context';
import { IdeProvider } from '../ide-provider';
import { RunningTasksMap } from '@nx-console/shared-running-tasks';

let isRegistered = false;

export function registerNxTaskTools(
  server: McpServer,
  ideProvider: IdeProvider,
  logger: Logger,
  telemetry?: NxConsoleTelemetryLogger,
): void {
  if (isRegistered) {
    return;
  }
  server.tool(
    NX_CURRENT_RUNNING_TASKS_DETAILS,
    `Returns a list of running commands (also called tasks) from currently running Nx CLI processes. This will include the process ID of the Nx CLI processes with task IDs and their status.
    There will be scenarios where the current process is not running anymore (as denoted by Stopped).
    Use this tool if users ask for information about recently run tests, builds or other commands.
    Use this tool for assisting with debugging and getting details about the current running tasks.

    Use ${NX_CURRENT_RUNNING_TASK_OUTPUT} to get the terminal output for specific tasks.
    `,
    {
      destructiveHint: false,
      readOnlyHint: true,
      openWorldHint: false,
    },
    nxCurrentlyRunningTasksDetails(telemetry, ideProvider),
  );
  server.tool(
    NX_CURRENT_RUNNING_TASK_OUTPUT,
    `Returns the terminal output for a specific task from currently running Nx CLI processes`,
    NxCurrentlyRunningTaskOutputSchema.shape,
    {
      destructiveHint: false,
      readOnlyHint: true,
      openWorldHint: false,
    },
    nxCurrentlyRunningTaskOutput(telemetry, ideProvider),
  );

  isRegistered = true;
  logger.log('Registered Nx task tools');
}

const nxCurrentlyRunningTasksDetails =
  (telemetry: NxConsoleTelemetryLogger | undefined, ideProvider: IdeProvider) =>
  async (): Promise<CallToolResult> => {
    telemetry?.logUsage('ai.tool-call', {
      tool: NX_CURRENT_RUNNING_TASKS_DETAILS,
    });

    const runningTasks = Object.values(await ideProvider.getRunningTasks());

    const content: CallToolResult['content'] = [];
    if (runningTasks.length === 0) {
      content.push({
        type: 'text',
        text: 'No running tasks',
      });
    } else {
      for (const task of runningTasks) {
        content.push({
          type: 'text',
          text: `TaskId: ${task.name} (status: ${task.status}) ${task.continuous ? '(continuous)' : ''}`,
        });
      }
    }

    return {
      content,
    };
  };

const NxCurrentlyRunningTaskOutputSchema = z.object({
  taskId: z.string().describe('The task ID of the task to get the output for'),
});

type NxCurrentlyRunningTaskOutputType = z.infer<
  typeof NxCurrentlyRunningTaskOutputSchema
>;
const nxCurrentlyRunningTaskOutput =
  (telemetry: NxConsoleTelemetryLogger | undefined, ideProvider: IdeProvider) =>
  async ({
    taskId,
  }: NxCurrentlyRunningTaskOutputType): Promise<CallToolResult> => {
    telemetry?.logUsage('ai.tool-call', {
      tool: NX_CURRENT_RUNNING_TASK_OUTPUT,
    });

    const runningTasks = await ideProvider.getRunningTasks();

    let task: RunningTasksMap[string] | undefined = runningTasks[taskId];
    if (!task) {
      task = Object.values(runningTasks).find((t) => t.name.includes(taskId));
    }

    if (!task) {
      return {
        content: [
          {
            type: 'text',
            text: `No task found with ID ${taskId}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `TaskId: ${task.name} (status: ${task.status}) ${task.continuous ? '(continuous)' : ''} Output: 
${task.output}`,
        },
      ],
    };
  };
