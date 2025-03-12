import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getDocsContext,
  getDocsPrompt,
  getGeneratorNamesAndDescriptions,
  getGeneratorSchema,
  getGeneratorsPrompt,
  getNxJsonPrompt,
  getProjectGraphErrorsPrompt,
  getProjectGraphPrompt,
} from '@nx-console/shared-llm-context';
import {
  checkIsNxWorkspace,
  findMatchingProject,
} from '@nx-console/shared-npm';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { Logger } from '@nx-console/shared-utils';
import { z } from 'zod';
import { getMcpLogger } from './mcp-logger';

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { NxGeneratorsRequestOptions } from '@nx-console/language-server-types';
import { GeneratorCollectionInfo } from '@nx-console/shared-schema';
import {
  FocusProjectMessage,
  FocusTaskMessage,
  FullProjectGraphMessage,
  IdeCallbackMessage,
  NxWorkspace,
} from '@nx-console/shared-types';

export interface NxWorkspaceInfoProvider {
  nxWorkspace: (
    workspacePath: string,
    logger: Logger,
    reset?: boolean,
  ) => Promise<NxWorkspace | undefined>;
  getGenerators: (
    workspacePath: string,
    options?: NxGeneratorsRequestOptions,
    logger?: Logger,
  ) => Promise<GeneratorCollectionInfo[] | undefined>;
}

export class NxMcpServerWrapper {
  private server: McpServer;
  private logger: Logger;
  private _nxWorkspacePath: string;

  constructor(
    initialWorkspacePath: string,
    private nxWorkspaceInfoProvider: NxWorkspaceInfoProvider,
    private ideCallback?: (message: IdeCallbackMessage) => void,
    private telemetry?: NxConsoleTelemetryLogger,
    logger?: Logger,
  ) {
    this._nxWorkspacePath = initialWorkspacePath;
    this.server = new McpServer({
      name: 'Nx MCP',
      version: '0.0.1',
    });

    this.server.server.registerCapabilities({
      logging: {},
    });

    this.logger = logger ?? getMcpLogger(this.server);
    this.registerTools();
  }

  setNxWorkspacePath(path: string) {
    this.logger.log(`Setting nx workspace path to ${path}`);
    this._nxWorkspacePath = path;
  }

  getMcpServer(): McpServer {
    return this.server;
  }

  private registerTools(): void {
    this.server.tool(
      'nx_workspace',
      'Returns a readable representation of the nx project graph and the nx.json that configures nx. If there are project graph errors, it also returns them. Use it to answer questions about the nx workspace and architecture',
      async () => {
        this.telemetry?.logUsage('ai.tool-call', {
          tool: 'nx_workspace',
        });
        try {
          if (!(await checkIsNxWorkspace(this._nxWorkspacePath))) {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: 'Error: The provided root is not a valid nx workspace.',
                },
              ],
            };
          }

          const workspace = await this.nxWorkspaceInfoProvider.nxWorkspace(
            this._nxWorkspacePath,
            this.logger,
          );
          if (!workspace) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Error: Workspace not found' }],
            };
          }
          const content: CallToolResult['content'] = [];
          if (workspace.nxJson) {
            content.push({
              type: 'text',
              text: getNxJsonPrompt(workspace.nxJson),
            });
          }
          const hasProjects =
            workspace.projectGraph &&
            Object.keys(workspace.projectGraph.nodes).length > 0;

          if (hasProjects) {
            content.push({
              type: 'text',
              text: getProjectGraphPrompt(workspace.projectGraph),
            });
          }
          if (workspace.errors) {
            content.push({
              type: 'text',
              text: getProjectGraphErrorsPrompt(
                workspace.errors,
                !!workspace.isPartial,
              ),
            });
          }
          return {
            content,
          };
        } catch (e) {
          return {
            content: [{ type: 'text', text: String(e) }],
          };
        }
      },
    );

    this.server.tool(
      'nx_project_details',
      'Returns the complete project configuration in JSON format for a given nx project.',
      {
        projectName: z
          .string()
          .describe('The name of the project to get details for'),
      },
      async ({ projectName }) => {
        this.telemetry?.logUsage('ai.tool-call', {
          tool: 'nx_project_details',
        });
        const workspace = await this.nxWorkspaceInfoProvider.nxWorkspace(
          this._nxWorkspacePath,
          this.logger,
        );
        if (!workspace) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Error: Workspace not found' }],
          };
        }
        const project = await findMatchingProject(
          projectName,
          workspace.projectGraph.nodes,
          this._nxWorkspacePath,
        );

        if (!project) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Project ${projectName} not found`,
              },
            ],
          };
        }

        return {
          content: [
            { type: 'text', text: JSON.stringify(project.data, null, 2) },
          ],
        };
      },
    );

    this.server.tool(
      'nx_docs',
      'Returns a list of documentation sections that could be relevant to the user query. IMPORTANT: ALWAYS USE THIS IF YOU ARE ANSWERING QUESTIONS ABOUT NX. NEVER ASSUME KNOWLEDGE ABOUT NX BECAUSE IT WILL PROBABLY BE OUTDATED. Use it to learn about nx, its configuration and options instead of assuming knowledge about it.',
      {
        userQuery: z
          .string()
          .describe(
            'The user query to get docs for. You can pass the original user query verbatim or summarize it.',
          ),
      },
      async ({ userQuery }: { userQuery: string }) => {
        this.telemetry?.logUsage('ai.tool-call', {
          tool: 'nx_docs',
        });
        const docsPages = await getDocsContext(userQuery);
        return {
          content: [{ type: 'text', text: getDocsPrompt(docsPages) }],
        };
      },
    );

    this.server.tool(
      'nx_generators',
      'Returns a list of generators that could be relevant to the user query.',
      async () => {
        this.telemetry?.logUsage('ai.tool-call', {
          tool: 'nx_generators',
        });
        const generators = await this.nxWorkspaceInfoProvider.getGenerators(
          this._nxWorkspacePath,
          undefined,
          this.logger,
        );
        if (!generators) {
          return {
            content: [{ type: 'text', text: 'No generators found' }],
          };
        }
        if (generators.length === 0) {
          return {
            content: [{ type: 'text', text: 'No generators found' }],
          };
        }

        const generatorNamesAndDescriptions =
          await getGeneratorNamesAndDescriptions(generators);
        const prompt = await getGeneratorsPrompt(generatorNamesAndDescriptions);
        return {
          content: [{ type: 'text', text: prompt }],
        };
      },
    );

    this.server.tool(
      'nx_generator_schema',
      'Returns the detailed JSON schema for an nx generator',
      {
        generatorName: z
          .string()
          .describe(
            'The name of the generator to get schema for. Use the generator name from the nx_generators tool.',
          ),
      },
      async ({ generatorName }) => {
        this.telemetry?.logUsage('ai.tool-call', {
          tool: 'nx_generator_schema',
        });
        const generators = await this.nxWorkspaceInfoProvider.getGenerators(
          this._nxWorkspacePath,
          undefined,
          this.logger,
        );
        if (!generators) {
          return {
            content: [{ type: 'text', text: 'No generators found' }],
          };
        }
        const generatorDetails = await getGeneratorSchema(
          generatorName,
          generators,
        );

        return {
          content: [
            {
              type: 'text',
              text: `
Found generator schema for ${generatorName}: ${JSON.stringify(
                generatorDetails,
              )}.          
**IMPORTANT FIRST STEP**: When generating libraries, apps, or components:

1. FIRST navigate to the parent directory where you want to create the item:
- Example: 'cd libs/shared' to create a library in libs/shared

2. THEN run the generate command using the positional arg for the name & directory:
- Example: 'nx generate @nx/js:library library-name' instead of using --name or --directory

3. AVOID using --directory flag when possible as it can lead to path confusion
- Use 'cd' to change directories and specify the positional arg instead

This approach provides better clarity about where new code will be generated
and follows the Nx workspace convention for project organization.
            `,
            },
          ],
        };
      },
    );

    if (this.ideCallback) {
      this.registerIdeCallbackTools();
    }
  }

  private registerIdeCallbackTools(): void {
    this.server.tool(
      'nx_visualize_graph',
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
      async ({ visualizationType, projectName, taskName }) => {
        this.telemetry?.logUsage('ai.tool-call', {
          tool: 'nx_visualize_graph',
          kind: visualizationType,
        });
        if (this.ideCallback) {
          switch (visualizationType) {
            case 'project':
              if (!projectName) {
                return {
                  isError: true,
                  content: [{ type: 'text', text: 'Project name is required' }],
                };
              }
              this.ideCallback({
                type: 'focus-project',
                payload: {
                  projectName,
                },
              } satisfies FocusProjectMessage);
              return {
                content: [
                  {
                    type: 'text',
                    text: `Opening project graph for ${projectName}. There can only be one graph visualization open at a time so avoid similar tool calls unless the user specifically requests it.`,
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
              this.ideCallback({
                type: 'focus-task',
                payload: {
                  projectName,
                  taskName,
                },
              } satisfies FocusTaskMessage);
              return {
                content: [
                  {
                    type: 'text',
                    text: `Opening graph focused on task ${taskName} for project ${projectName}. There can only be one graph visualization open at a time so avoid similar tool calls unless the user specifically requests it.`,
                  },
                ],
              };
            case 'full-project-graph':
              this.ideCallback({
                type: 'full-project-graph',
              } satisfies FullProjectGraphMessage);
              return {
                content: [
                  {
                    type: 'text',
                    text: 'Opening full project graph. There can only be one graph visualization open at a time so avoid similar tool calls unless the user specifically requests it.',
                  },
                ],
              };
          }
        }
        return {
          isError: true,
          content: [{ type: 'text', text: 'No IDE available' }],
        };
      },
    );
  }
}
