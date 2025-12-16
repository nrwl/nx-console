import {
  CallToolResult,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { Logger } from '@nx-console/shared-utils';

import z from 'zod';
import {
  NX_CURRENT_RUNNING_TASK_OUTPUT,
  NX_CURRENT_RUNNING_TASKS_DETAILS,
} from '@nx-console/shared-llm-context';
import { IdeProvider } from '../ide-provider';
import { RunningTasksMap } from '@nx-console/shared-running-tasks';
import { isToolEnabled } from '../tool-filter';
import { ToolRegistry } from '../tool-registry';

const TASK_OUTPUT_CHUNK_SIZE = 10000;

export function registerNxTaskTools(
  registry: ToolRegistry,
  ideProvider: IdeProvider,
  logger: Logger,
  telemetry?: NxConsoleTelemetryLogger,
  toolsFilter?: string[],
): void {
  if (!isToolEnabled(NX_CURRENT_RUNNING_TASKS_DETAILS, toolsFilter)) {
    logger.debug?.(
      `Skipping ${NX_CURRENT_RUNNING_TASKS_DETAILS} - disabled by tools filter`,
    );
  } else {
    registry.registerTool({
      name: NX_CURRENT_RUNNING_TASKS_DETAILS,
      description: `Returns a list of running commands (also called tasks) from currently running Nx CLI processes. This will include the process ID of the Nx CLI processes with task IDs and their status.
    There will be scenarios where the current process is not running anymore (as denoted by Stopped).
    Use this tool if users ask for information about recently run tests, builds or other commands.
    Use this tool for assisting with debugging and getting details about the current running tasks.

    Use ${NX_CURRENT_RUNNING_TASK_OUTPUT} to get the terminal output for specific tasks.
    `,
      annotations: {
        destructiveHint: false,
        readOnlyHint: true,
        openWorldHint: false,
      },
      handler: async () =>
        nxCurrentlyRunningTasksDetails(telemetry, ideProvider)(),
    });
  }

  if (!isToolEnabled(NX_CURRENT_RUNNING_TASK_OUTPUT, toolsFilter)) {
    logger.debug?.(
      `Skipping ${NX_CURRENT_RUNNING_TASK_OUTPUT} - disabled by tools filter`,
    );
  } else {
    registry.registerTool({
      name: NX_CURRENT_RUNNING_TASK_OUTPUT,
      description:
        'Returns the terminal output for a specific task from currently running Nx CLI processes. For large outputs, if a pagination token is returned, call this tool again with the token to retrieve additional results. Pagination works from the end of the outputs - page 0 shows the most recent output (end of the log), and subsequent pages show progressively older output.',
      inputSchema: NxCurrentlyRunningTaskOutputSchema.shape,
      annotations: {
        destructiveHint: false,
        readOnlyHint: true,
        openWorldHint: false,
      },
      handler: async (args) =>
        nxCurrentlyRunningTaskOutput(
          telemetry,
          ideProvider,
        )(args as z.infer<typeof NxCurrentlyRunningTaskOutputSchema>),
    });
  }

  logger.debug?.('Registered Nx task tools');
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
  pageToken: z
    .number()
    .optional()
    .describe(
      'Token for pagination (bottom-up: page 0 = most recent output, higher pages = older output). Pass the token from the previous response to get the next page.',
    ),
});

type NxCurrentlyRunningTaskOutputType = z.infer<
  typeof NxCurrentlyRunningTaskOutputSchema
>;
export const nxCurrentlyRunningTaskOutput =
  (telemetry: NxConsoleTelemetryLogger | undefined, ideProvider: IdeProvider) =>
  async ({
    taskId,
    pageToken,
  }: NxCurrentlyRunningTaskOutputType): Promise<
    CallToolResult & { readonly content: TextContent[] }
  > => {
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

    const pageNumber = pageToken ?? 0;

    // Bottom-up pagination: page 0 shows the most recent (last) chunk
    const output = task.output;
    const outputLength = output.length;

    // Handle empty output
    if (outputLength === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No task outputs available for ${task.name}`,
          },
        ],
      };
    }

    // Calculate the chunk boundaries from the end
    const endIndex = outputLength - pageNumber * TASK_OUTPUT_CHUNK_SIZE;
    const startIndex = Math.max(0, endIndex - TASK_OUTPUT_CHUNK_SIZE);

    // Check if we're beyond the available content
    if (startIndex >= outputLength || endIndex <= 0) {
      return {
        content: [
          {
            type: 'text',
            text: `TaskId: ${task.name} - no more content on page ${pageNumber}`,
          },
        ],
      };
    }

    const chunk = output.slice(startIndex, endIndex);
    const hasMore = startIndex > 0;

    const content: TextContent[] = [];
    const continuedString =
      pageNumber > 0 ? ` (currently on page ${pageNumber})` : '';

    let chunkText = chunk;
    if (hasMore) {
      chunkText = `...[older output on page ${pageNumber + 1}]\n${chunk}`;
    }

    content.push({
      type: 'text',
      text: `TaskId: ${task.name} (status: ${task.status}) ${task.continuous ? '(continuous)' : ''}${continuedString} Output:
${chunkText}`,
    });

    if (hasMore) {
      content.push({
        type: 'text',
        text: `Next page token: ${pageNumber + 1}. Call this tool again with the next page token to retrieve older output.`,
      });
    }

    return { content };
  };
