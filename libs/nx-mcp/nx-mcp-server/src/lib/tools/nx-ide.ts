import {
  getProjectGraphVisualizationMessage,
  getTaskGraphVisualizationMessage,
  NX_VISUALIZE_GRAPH,
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

  logger.debug?.('Registered Nx IDE tools');
}
