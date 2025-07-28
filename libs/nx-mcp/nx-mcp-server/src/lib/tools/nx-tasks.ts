import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { Logger } from '@nx-console/shared-utils';
import {
  getRunningTaskById,
  getRunningTasks,
} from '@nx-console/shared-running-tasks';
import z from 'zod';
import {
  NX_CURRENT_RUNNING_TASK_OUTPUT,
  NX_CURRENT_RUNNING_TASKS_DETAILS,
} from '@nx-console/shared-llm-context';

let isRegistered = false;

export function registerNxTaskTools(
  workspacePath: string,
  server: McpServer,
  logger: Logger,
  telemetry?: NxConsoleTelemetryLogger,
): void {
  if (isRegistered) {
    logger.log('Nx task tools already registered, skipping');
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
    nxCurrentlyRunningTasksDetails(telemetry),
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
    nxCurrentlyRunningTaskOutput(telemetry),
  );

  isRegistered = true;
  logger.log('Registered Nx task tools');
}

const nxCurrentlyRunningTasksDetails =
  (telemetry: NxConsoleTelemetryLogger | undefined) =>
  async (): Promise<CallToolResult> => {
    telemetry?.logUsage('ai.tool-call', {
      tool: NX_CURRENT_RUNNING_TASKS_DETAILS,
    });

    const runningTasks = getRunningTasks();

    const content: CallToolResult['content'] = [];
    for (const task of runningTasks) {
      content.push({
        type: 'text',
        text: `TaskId: ${task.name} (status: ${task.status}) ${task.continuous ? '(continuous)' : ''}`,
      });
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
  (telemetry: NxConsoleTelemetryLogger | undefined) =>
  async ({
    taskId,
  }: NxCurrentlyRunningTaskOutputType): Promise<CallToolResult> => {
    telemetry?.logUsage('ai.tool-call', {
      tool: NX_CURRENT_RUNNING_TASK_OUTPUT,
    });

    const task = getRunningTaskById(taskId);
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

export function isNxTaskToolsRegistered(): boolean {
  return isRegistered;
}

export function resetNxTaskToolsState(): void {
  isRegistered = false;
}
