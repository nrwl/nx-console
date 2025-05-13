import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { Logger } from '@nx-console/shared-utils';
import { getRunningTasks } from '@nx-console/shared-running-tasks';
import z from 'zod';
import {
  NX_CURRENT_RUNNING_TASK_OUTPUT,
  NX_CURRENT_RUNNING_TASKS_DETAILS,
} from '@nx-console/shared-llm-context';
export function registerNxTaskTools(
  workspacePath: string,
  server: McpServer,
  logger: Logger,
  telemetry?: NxConsoleTelemetryLogger,
) {
  server.tool(
    NX_CURRENT_RUNNING_TASKS_DETAILS,
    `Returns a list of running commands (also called tasks) from currently running Nx CLI processes. This will include the process ID of the Nx CLI processes with task IDs and their status.
    There will be scenarios where the current process is not running anymore (as denoted by Stopped).
    Use this tool for assisting with debugging and getting details about the current running tasks.

    Use nx-currently_running_task_output to get the terminal output for specific tasks.
    `,
    nxCurrentlyRunningTasksDetails(telemetry),
  );
  server.tool(
    NX_CURRENT_RUNNING_TASK_OUTPUT,
    `Returns the terminal output for a specific task from currently running Nx CLI processes`,
    NxCurrentlyRunningTaskOutputSchema.shape,
    nxCurrentlyRunningTaskOutput(telemetry),
  );
}

const nxCurrentlyRunningTasksDetails =
  (telemetry: NxConsoleTelemetryLogger | undefined) =>
  async (): Promise<CallToolResult> => {
    telemetry?.logUsage('ai.tool-call', {
      tool: 'nx-currently_running_tasks_details',
    });

    const running_tasks = getRunningTasks();

    const content: CallToolResult['content'] = [];
    for (const task of running_tasks) {
      content.push({
        type: 'text',
        text: `processId: ${task.processId} (${task.status})`,
      });
      for (const taskDetail of task.tasks) {
        content.push({
          type: 'text',
          text: `-- taskId: ${taskDetail.name} (${taskDetail.status})`,
        });
      }
    }

    return {
      content,
    };
  };

const NxCurrentlyRunningTaskOutputSchema = z.object({
  processId: z
    .number()
    .optional()
    .describe('The process ID of the Nx CLI process'),
  taskId: z.string().describe('The task ID of the task to get the output for'),
});

type NxCurrentlyRunningTaskOutputType = z.infer<
  typeof NxCurrentlyRunningTaskOutputSchema
>;
const nxCurrentlyRunningTaskOutput =
  (telemetry: NxConsoleTelemetryLogger | undefined) =>
  async ({
    processId,
    taskId,
  }: NxCurrentlyRunningTaskOutputType): Promise<CallToolResult> => {
    telemetry?.logUsage('ai.tool-call', {
      tool: 'nx-currently_running_task_output',
    });

    const running_tasks = getRunningTasks();
    const content: CallToolResult['content'] = [];

    // If processId is specified, look for task within that specific process
    if (processId) {
      const process = running_tasks.find(
        (task) => task.processId === processId,
      );

      if (!process) {
        content.push({
          type: 'text',
          text: `No task found with process ID ${processId}`,
        });
        return { content };
      }

      const taskDetail = process.tasks.find((task) => task.name === taskId);

      if (!taskDetail) {
        content.push({
          type: 'text',
          text: `No task found with task ID ${taskId} in process ID ${processId}`,
        });
        return { content };
      }

      content.push({
        type: 'text',
        text: `Task output for process ID ${processId} and task ID ${taskId} (status: ${taskDetail.status}):`,
      });
      content.push({ type: 'text', text: taskDetail.output });
    }
    // If no processId specified, search across all processes
    else {
      let foundTask = null;
      for (const runningTask of running_tasks) {
        const matchingTask = runningTask.tasks.find(
          (task) => task.name === taskId,
        );
        if (matchingTask) {
          foundTask = matchingTask;
          break;
        }
      }

      if (!foundTask) {
        content.push({
          type: 'text',
          text: `No task found with task ID ${taskId}`,
        });
      } else {
        content.push({
          type: 'text',
          text: `Task output for task ID ${taskId} (status: ${foundTask.status}):`,
        });
        content.push({ type: 'text', text: foundTask.output });
      }
    }

    return { content };
  };
