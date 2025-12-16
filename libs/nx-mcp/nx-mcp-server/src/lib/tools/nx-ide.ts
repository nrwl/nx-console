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
import { IdeProvider } from '../ide-provider';
import { isToolEnabled } from '../tool-filter';
import { ToolRegistry } from '../tool-registry';

export function registerNxIdeTools(
  registry: ToolRegistry,
  logger: Logger,
  ideProvider: IdeProvider,
  telemetry?: NxConsoleTelemetryLogger,
  toolsFilter?: string[],
): void {
  if (!isToolEnabled(NX_VISUALIZE_GRAPH, toolsFilter)) {
    logger.debug?.(`Skipping ${NX_VISUALIZE_GRAPH} - disabled by tools filter`);
  } else {
    registry.registerTool({
      name: NX_VISUALIZE_GRAPH,
      description:
        'Visualize the Nx graph. This can show either a project graph or a task graph depending on the parameters. Use this to help users understand project dependencies or task dependencies. There can only be one graph visualization open at a time so avoid similar tool calls unless the user specifically requests it.',
      inputSchema: {
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
      annotations: {
        readOnlyHint: false,
        openWorldHint: false,
      },
      handler: async (args) => {
        const { visualizationType, projectName, taskName } = args as {
          visualizationType: 'project' | 'project-task' | 'full-project-graph';
          projectName?: string;
          taskName?: string;
        };
        telemetry?.logUsage('ai.tool-call', {
          tool: NX_VISUALIZE_GRAPH,
          kind: visualizationType,
        });

        if (!ideProvider || !ideProvider.isAvailable()) {
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

              return {
                content: [
                  {
                    type: 'text',
                    text: getTaskGraphVisualizationMessage(
                      projectName,
                      taskName,
                    ),
                  },
                ],
              };
            case 'full-project-graph':
              await ideProvider.showFullProjectGraph();

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
          return {
            isError: true,
            content: [
              { type: 'text', text: `IDE communication error: ${error}` },
            ],
          };
        }
      },
    });
  }

  if (!isToolEnabled(NX_RUN_GENERATOR, toolsFilter)) {
    logger.debug?.(`Skipping ${NX_RUN_GENERATOR} - disabled by tools filter`);
  } else {
    registry.registerTool({
      name: NX_RUN_GENERATOR,
      description:
        'Opens the Nx Console Generate UI in the IDE with the provided options pre-filled. This tool does NOT directly execute the generator - instead it opens a visual form pre-filled with your options, allowing the user to review, modify, and confirm before execution. The `cwd` parameter specifies the parent directory path (relative to workspace root) where the generated item should be created - this is particularly important when generating libraries, apps, or components in specific locations. This tool can also be called to update options for an existing generator invocation. Prefer this tool over CLI commands when an IDE is available, as it provides a user-review workflow.',
      inputSchema: {
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
      annotations: {
        readOnlyHint: false,
        openWorldHint: false,
        destructiveHint: false,
      },
      handler: async (args) => {
        const { generatorName, options, cwd } = args as {
          generatorName: string;
          options?: Record<string, unknown>;
          cwd?: string;
        };
        telemetry?.logUsage('ai.tool-call', {
          tool: NX_RUN_GENERATOR,
        });

        if (!ideProvider || !ideProvider.isAvailable()) {
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
          return {
            isError: true,
            content: [
              { type: 'text', text: `IDE communication error: ${error}` },
            ],
          };
        }
      },
    });
  }

  logger.debug?.('Registered Nx IDE tools');
}
