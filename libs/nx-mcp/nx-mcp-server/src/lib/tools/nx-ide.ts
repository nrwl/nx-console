import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getProjectGraphVisualizationMessage,
  getTaskGraphVisualizationMessage,
  createGeneratorUiResponseMessage,
  NX_VISUALIZE_GRAPH,
  NX_RUN_GENERATOR,
} from '@nx-console/shared-llm-context';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { Logger } from '@nx-console/shared-utils';
import { z } from 'zod';
import { McpIdeMessageSender } from '../mcp-message-sender';
import { IdeProvider } from '../ide-provider';

// Simple state tracking
let isRegistered = false;

/**
 * Register IDE-specific tools that require an active IDE connection
 */
export function registerNxIdeTools(
  server: McpServer,
  logger: Logger,
  ideProvider: IdeProvider,
  telemetry?: NxConsoleTelemetryLogger,
  messageSender?: McpIdeMessageSender,
  nxWorkspacePath?: string,
): void {
  if (isRegistered) {
    logger.log('Nx IDE tools already registered, skipping');
    return;
  }

  if (!ideProvider.isAvailable()) {
    logger.log('No IDE provider available, skipping IDE tool registration');
    return;
  }

  // Register nx_visualize_graph tool
  server.tool(
    NX_VISUALIZE_GRAPH,
    'Visualize the Nx graph. This can show either a project graph or a task graph depending on the parameters. Use this to help users understand project dependencies or task dependencies. There can only be one graph visualization open at a time so avoid similar tool calls unless the user specifically requests it.',
    {
      visualizationType: z
        .enum(['project', 'project-task', 'full-project-graph'])
        .describe(
          'The way in which to visualize the graph. "project" shows the project graph focused on a single project. "project-task" shows the task graph focused on a specific task for a specific project. "full-project-graph" shows the full project graph for the entire repository.',
        ),
      projectName: z
        .string()
        .optional()
        .describe(
          'The name of the project to focus the graph on. Only used if visualizationType is "project" or "project-task".',
        ),
      taskName: z
        .string()
        .optional()
        .describe(
          'The name of the task to focus the graph on. Only used if visualizationType is "project-task".',
        ),
    },
    {
      readOnlyHint: false,
      openWorldHint: false,
    },
    async ({ visualizationType, projectName, taskName }) => {
      telemetry?.logUsage('ai.tool-call', {
        tool: NX_VISUALIZE_GRAPH,
        kind: visualizationType,
      });

      // Notify IDE about tool invocation
      await messageSender?.notifyToolInvocation(NX_VISUALIZE_GRAPH, {
        visualizationType,
        projectName,
        taskName,
      });

      if (!ideProvider || !ideProvider.isAvailable()) {
        await messageSender?.notifyToolError(
          NX_VISUALIZE_GRAPH,
          'No IDE provider available',
        );
        return {
          isError: true,
          content: [{ type: 'text', text: 'No IDE provider available' }],
        };
      }

      try {
        switch (visualizationType) {
          case 'project':
            if (!projectName) {
              return {
                isError: true,
                content: [{ type: 'text', text: 'Project name is required' }],
              };
            }
            await ideProvider.focusProject(projectName);
            await messageSender?.notifyToolCompletion(NX_VISUALIZE_GRAPH, {
              visualizationType: 'project',
              projectName,
            });
            return {
              content: [
                {
                  type: 'text',
                  text: getProjectGraphVisualizationMessage(projectName),
                },
              ],
            };
          case 'project-task':
            if (!taskName) {
              return {
                isError: true,
                content: [
                  {
                    type: 'text',
                    text: 'Task name is required for task graph visualization',
                  },
                ],
              };
            }
            if (!projectName) {
              return {
                isError: true,
                content: [{ type: 'text', text: 'Project name is required' }],
              };
            }
            await ideProvider.focusTask(projectName, taskName);
            await messageSender?.notifyToolCompletion(NX_VISUALIZE_GRAPH, {
              visualizationType: 'project-task',
              projectName,
              taskName,
            });
            return {
              content: [
                {
                  type: 'text',
                  text: getTaskGraphVisualizationMessage(projectName, taskName),
                },
              ],
            };
          case 'full-project-graph':
            await ideProvider.showFullProjectGraph();
            await messageSender?.notifyToolCompletion(NX_VISUALIZE_GRAPH, {
              visualizationType: 'full-project-graph',
            });
            return {
              content: [
                {
                  type: 'text',
                  text: getProjectGraphVisualizationMessage(),
                },
              ],
            };
        }
      } catch (error) {
        await messageSender?.notifyToolError(
          NX_VISUALIZE_GRAPH,
          `IDE communication error: ${error}`,
        );
        return {
          isError: true,
          content: [
            { type: 'text', text: `IDE communication error: ${error}` },
          ],
        };
      }
    },
  );

  // Register nx_run_generator tool
  server.tool(
    NX_RUN_GENERATOR,
    'Opens the generate ui with whatever options you provide prefilled. ALWAYS USE THIS to run nx generators. Use the nx_generators and nx_generator_schema tools to learn about the available options BEFORE using this tool. ALWAYS use this when the user wants to generate something and ALWAYS use this instead of running a generator directly via the CLI. You can also call this tool to overwrite the options for an existing generator invocation.',
    {
      generatorName: z.string().describe('The name of the generator to run'),
      options: z
        .record(z.string(), z.unknown())
        .describe('The options to pass to the generator'),
      cwd: z
        .string()
        .optional()
        .describe(
          'The current working directory to run the generator from. This is always relative to the workspace root. If not specified, the workspace root will be used.',
        ),
    },
    {
      readOnlyHint: false,
      openWorldHint: false,
      destructiveHint: false,
    },
    async ({ generatorName, options, cwd }) => {
      telemetry?.logUsage('ai.tool-call', {
        tool: NX_RUN_GENERATOR,
      });

      // Notify IDE about tool invocation
      await messageSender?.notifyToolInvocation(NX_RUN_GENERATOR, {
        generatorName,
        options,
        cwd,
      });

      if (!nxWorkspacePath) {
        await messageSender?.notifyToolError(
          NX_RUN_GENERATOR,
          'Error: Workspace path not set',
        );
        return {
          isError: true,
          content: [{ type: 'text', text: 'Error: Workspace path not set' }],
        };
      }

      if (!ideProvider || !ideProvider.isAvailable()) {
        await messageSender?.notifyToolError(
          NX_RUN_GENERATOR,
          'No IDE provider available',
        );
        return {
          isError: true,
          content: [{ type: 'text', text: 'No IDE provider available' }],
        };
      }

      try {
        const logFileName = await ideProvider.openGenerateUi(
          generatorName,
          options ?? {},
          cwd,
        );

        await messageSender?.notifyToolCompletion(NX_RUN_GENERATOR, {
          generatorName,
          logFileName,
        });

        return {
          content: [
            {
              type: 'text',
              text: createGeneratorUiResponseMessage(
                generatorName,
                logFileName,
              ),
            },
          ],
        };
      } catch (error) {
        await messageSender?.notifyToolError(
          NX_RUN_GENERATOR,
          `IDE communication error: ${error}`,
        );
        return {
          isError: true,
          content: [
            { type: 'text', text: `IDE communication error: ${error}` },
          ],
        };
      }
    },
  );

  isRegistered = true;
  logger.log('Registered Nx IDE tools');
}

/**
 * Check if IDE tools are currently registered
 */
export function isNxIdeToolsRegistered(): boolean {
  return isRegistered;
}

/**
 * Reset registration state (for testing or server restart)
 */
export function resetNxIdeToolsState(): void {
  isRegistered = false;
}
