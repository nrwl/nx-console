import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  createGeneratorUiResponseMessage,
  getDocsContext,
  getDocsPrompt,
  getGeneratorNamesAndDescriptions,
  getGeneratorSchema,
  getGeneratorsPrompt,
  getPluginsInformation,
  getProjectGraphVisualizationMessage,
  getTaskGraphVisualizationMessage,
  NX_WORKSPACE_PATH,
} from '@nx-console/shared-llm-context';
import { findMatchingProject } from '@nx-console/shared-npm';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { Logger } from '@nx-console/shared-utils';
import { z } from 'zod';
import { getMcpLogger } from './mcp-logger';

import { NxGeneratorsRequestOptions } from '@nx-console/language-server-types';
import { NxVersion } from '@nx-console/nx-version';
import { GeneratorCollectionInfo } from '@nx-console/shared-schema';
import { NxWorkspace, IIdeJsonRpcClient } from '@nx-console/shared-types';
import { readFile } from 'fs/promises';
import path from 'path';
import { registerNxCloudTools } from './tools/nx-cloud';
import {
  NX_AVAILABLE_PLUGINS,
  NX_DOCS,
  NX_GENERATOR_SCHEMA,
  NX_GENERATORS,
  NX_PROJECT_DETAILS,
  NX_RUN_GENERATOR,
  NX_VISUALIZE_GRAPH,
} from '@nx-console/shared-llm-context';
import { registerNxTaskTools } from './tools/nx-tasks';
import { registerNxWorkspaceTool } from './tools/nx-workspace';
import { McpIdeMessageSender } from './mcp-message-sender';

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
  getGitDiffs: (
    workspacePath: string,
    baseSha?: string,
    headSha?: string,
  ) => Promise<{ path: string; diffContent: string }[] | null>;
  isNxCloudEnabled: () => Promise<boolean>;
}

export class NxMcpServerWrapper {
  private server: McpServer;
  private logger: Logger;
  private _nxWorkspacePath?: string;
  private ideClient?: IIdeJsonRpcClient;
  private ideAvailable = false;
  private messageSender: McpIdeMessageSender;

  constructor(
    initialWorkspacePath: string | undefined,
    private nxWorkspaceInfoProvider: NxWorkspaceInfoProvider,
    private telemetry?: NxConsoleTelemetryLogger,
    logger?: Logger,
    ideClient?: IIdeJsonRpcClient,
    ideAvailable?: boolean,
  ) {
    this._nxWorkspacePath = initialWorkspacePath;
    this.ideClient = ideClient;
    this.ideAvailable = ideAvailable ?? false;
    this.messageSender = new McpIdeMessageSender(ideClient, this.ideAvailable);

    this.server = new McpServer({
      name: 'Nx MCP',
      version: '0.0.1',
    });

    this.server.server.registerCapabilities({
      logging: {},
    });

    this.logger = logger ?? getMcpLogger(this.server);

    // Log IDE connection status
    if (this.ideAvailable && this.ideClient) {
      this.logger.log('IDE client available and connected');

      // Set up disconnection handler if the client supports it
      if (
        'onDisconnection' in this.ideClient &&
        typeof this.ideClient.onDisconnection === 'function'
      ) {
        (this.ideClient as any).onDisconnection(() => {
          this.logger.log('IDE client disconnected');
          this.ideAvailable = false;
        });
      }
    } else {
      this.logger.log('Running in standalone mode (no IDE connection)');
    }
  }

  static async create(
    initialWorkspacePath: string | undefined,
    nxWorkspaceInfoProvider: NxWorkspaceInfoProvider,
    telemetry?: NxConsoleTelemetryLogger,
    logger?: Logger,
    ideClient?: IIdeJsonRpcClient,
    ideAvailable?: boolean,
  ): Promise<NxMcpServerWrapper> {
    const server = new NxMcpServerWrapper(
      initialWorkspacePath,
      nxWorkspaceInfoProvider,
      telemetry,
      logger,
      ideClient,
      ideAvailable,
    );
    await server.registerTools();
    return server;
  }

  async setNxWorkspacePath(path: string) {
    this.logger.log(`Setting nx workspace path to ${path}`);
    if (!this._nxWorkspacePath && !!path) {
      await this.registerWorkspaceTools();
    }
    this._nxWorkspacePath = path;
  }

  getMcpServer(): McpServer {
    return this.server;
  }

  /**
   * Check if IDE is available and connected
   */
  isIdeAvailable(): boolean {
    return this.ideAvailable && this.ideClient !== undefined;
  }

  /**
   * Get the IDE client instance (if available)
   */
  getIdeClient(): IIdeJsonRpcClient | undefined {
    return this.ideClient;
  }

  /**
   * Get the message sender instance
   */
  getMessageSender(): McpIdeMessageSender {
    return this.messageSender;
  }

  /**
   * Cleanup resources when server shuts down
   */
  cleanup(): void {
    if (this.ideClient) {
      try {
        this.ideClient.disconnect();
        this.logger.log('IDE client disconnected');
      } catch (error) {
        this.logger.log('Error disconnecting IDE client:', error);
      }
    }
  }

  /**
   * Update IDE client connection
   */
  updateIdeConnection(
    ideClient?: IIdeJsonRpcClient,
    ideAvailable = false,
  ): void {
    this.ideClient = ideClient;
    this.ideAvailable = ideAvailable;
    this.messageSender.updateIdeConnection(ideClient, ideAvailable);
  }

  private async registerTools(): Promise<void> {
    this.server.tool(
      NX_DOCS,
      'Returns a list of documentation sections that could be relevant to the user query. IMPORTANT: ALWAYS USE THIS IF YOU ARE ANSWERING QUESTIONS ABOUT NX. NEVER ASSUME KNOWLEDGE ABOUT NX BECAUSE IT WILL PROBABLY BE OUTDATED. Use it to learn about nx, its configuration and options instead of assuming knowledge about it.',
      {
        userQuery: z
          .string()
          .describe(
            'The user query to get docs for. You can pass the original user query verbatim or summarize it.',
          ),
      },
      {
        destructiveHint: false,
        readOnlyHint: true,
        openWorldHint: true,
      },
      async ({ userQuery }: { userQuery: string }) => {
        this.telemetry?.logUsage('ai.tool-call', {
          tool: NX_DOCS,
        });
        const docsPages = await getDocsContext(userQuery);
        return {
          content: [{ type: 'text', text: getDocsPrompt(docsPages) }],
        };
      },
    );

    this.server.tool(
      NX_AVAILABLE_PLUGINS,
      'Returns a list of available Nx plugins from the core team as well as local workspace Nx plugins.',
      {
        destructiveHint: false,
        readOnlyHint: true,
        openWorldHint: true,
      },
      async () => {
        this.telemetry?.logUsage('ai.tool-call', {
          tool: NX_AVAILABLE_PLUGINS,
        });

        let nxVersion: NxVersion | undefined = undefined;
        let nxWorkspace: NxWorkspace | undefined = undefined;
        const workspacePath: string | undefined = this._nxWorkspacePath;

        if (this._nxWorkspacePath) {
          nxWorkspace = await this.nxWorkspaceInfoProvider.nxWorkspace(
            this._nxWorkspacePath,
            this.logger,
          );
          nxVersion = nxWorkspace?.nxVersion;
        }

        const pluginsInfo = await getPluginsInformation(
          nxVersion,
          workspacePath,
          nxWorkspace,
          this.logger,
        );

        return {
          content: [
            {
              type: 'text',
              text: pluginsInfo.formattedText,
            },
          ],
        };
      },
    );

    if (this._nxWorkspacePath) {
      await this.registerWorkspaceTools();
    }

    if (this.isIdeAvailable()) {
      this.registerIdeTools();
    }
  }

  private async registerWorkspaceTools(): Promise<void> {
    this.server.tool(
      NX_WORKSPACE_PATH,
      'Returns the path to the Nx workspace root',
      {
        readOnlyHint: true,
      },
      async () => {
        this.telemetry?.logUsage('ai.tool-call', {
          tool: NX_WORKSPACE_PATH,
        });

        return {
          content: [
            {
              type: 'text',
              text: this._nxWorkspacePath ?? 'No workspace path set',
            },
          ],
        };
      },
    );

    if (this._nxWorkspacePath) {
      registerNxWorkspaceTool(
        this._nxWorkspacePath,
        this.server,
        this.logger,
        this.nxWorkspaceInfoProvider,
        this.telemetry,
      );
    }

    this.server.tool(
      NX_PROJECT_DETAILS,
      'Returns the complete project configuration in JSON format for a given nx project.',
      {
        projectName: z
          .string()
          .describe('The name of the project to get details for'),
      },
      {
        destructiveHint: false,
        readOnlyHint: true,
        openWorldHint: false,
      },
      async ({ projectName }) => {
        this.telemetry?.logUsage('ai.tool-call', {
          tool: NX_PROJECT_DETAILS,
        });
        if (!this._nxWorkspacePath) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Error: Workspace path not set' }],
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
      NX_GENERATORS,
      'Returns a list of generators that could be relevant to the user query.',
      {
        destructiveHint: false,
        readOnlyHint: true,
        openWorldHint: false,
      },
      async () => {
        this.telemetry?.logUsage('ai.tool-call', {
          tool: NX_GENERATORS,
        });
        if (!this._nxWorkspacePath) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Error: Workspace path not set' }],
          };
        }
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
        const prompt = getGeneratorsPrompt(generatorNamesAndDescriptions);
        return {
          content: [{ type: 'text', text: prompt }],
        };
      },
    );

    this.server.tool(
      NX_GENERATOR_SCHEMA,
      'Returns the detailed JSON schema for an nx generator',
      {
        generatorName: z
          .string()
          .describe(
            'The name of the generator to get schema for. Use the generator name from the nx_generators tool.',
          ),
      },
      {
        destructiveHint: false,
        readOnlyHint: true,
        openWorldHint: false,
      },
      async ({ generatorName }) => {
        this.telemetry?.logUsage('ai.tool-call', {
          tool: NX_GENERATOR_SCHEMA,
        });
        if (!this._nxWorkspacePath) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Error: Workspace path not set' }],
          };
        }
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

        let examples = '';
        try {
          const examplesPath = path.join(
            generators.find((g) => g.name === generatorName)?.schemaPath ?? '',
            '..',
            'examples.md',
          );
          examples = await readFile(examplesPath, 'utf-8');
        } catch (e) {
          examples = 'No examples available';
        }

        return {
          content: [
            {
              type: 'text',
              text: `
Found generator schema for ${generatorName}: ${JSON.stringify(
                generatorDetails,
              )}.
              ${
                this.isIdeAvailable()
                  ? `Follow up by using the nx_run_generator tool. When generating libraries, apps or components, use the cwd option to specify the parent directory where you want to create the item.`
                  : `**IMPORTANT FIRST STEP**: When generating libraries, apps, or components:

1. FIRST navigate to the parent directory where you want to create the item:
- Example: 'cd libs/shared' to create a library in libs/shared

2. THEN run the generate command using the positional arg for the name & directory:
- Example: 'nx generate @nx/js:library library-name' instead of using --name or --directory

3. AVOID using --directory flag when possible as it can lead to path confusion
- Use 'cd' to change directories and specify the positional arg instead

This approach provides better clarity about where new code will be generated
and follows the Nx workspace convention for project organization.`
              }

            `,
            },
            {
              type: 'text',
              text: 'Examples: \n' + examples,
            },
          ],
        };
      },
    );

    if (
      (await this.nxWorkspaceInfoProvider.isNxCloudEnabled()) &&
      this._nxWorkspacePath
    ) {
      registerNxCloudTools(
        this._nxWorkspacePath,
        this.server,
        this.logger,
        this.telemetry,
        this.nxWorkspaceInfoProvider.getGitDiffs,
      );
    }

    if (this._nxWorkspacePath) {
      registerNxTaskTools(
        this._nxWorkspacePath,
        this.server,
        this.logger,
        this.telemetry,
      );
    }
  }

  private registerIdeTools(): void {
    this.server.tool(
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
        this.telemetry?.logUsage('ai.tool-call', {
          tool: NX_VISUALIZE_GRAPH,
          kind: visualizationType,
        });

        // Notify IDE about tool invocation
        await this.messageSender.notifyToolInvocation(NX_VISUALIZE_GRAPH, {
          visualizationType,
          projectName,
          taskName,
        });

        if (!this.ideClient) {
          await this.messageSender.notifyToolError(
            NX_VISUALIZE_GRAPH,
            'No IDE client available',
          );
          return {
            isError: true,
            content: [{ type: 'text', text: 'No IDE client available' }],
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
              await this.ideClient.focusProject(projectName);
              await this.messageSender.notifyToolCompletion(
                NX_VISUALIZE_GRAPH,
                {
                  visualizationType: 'project',
                  projectName,
                },
              );
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
              await this.ideClient.focusTask(projectName, taskName);
              await this.messageSender.notifyToolCompletion(
                NX_VISUALIZE_GRAPH,
                {
                  visualizationType: 'project-task',
                  projectName,
                  taskName,
                },
              );
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
              await this.ideClient.showFullProjectGraph();
              await this.messageSender.notifyToolCompletion(
                NX_VISUALIZE_GRAPH,
                {
                  visualizationType: 'full-project-graph',
                },
              );
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
          await this.messageSender.notifyToolError(
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

    this.server.tool(
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
        this.telemetry?.logUsage('ai.tool-call', {
          tool: NX_RUN_GENERATOR,
        });

        // Notify IDE about tool invocation
        await this.messageSender.notifyToolInvocation(NX_RUN_GENERATOR, {
          generatorName,
          options,
          cwd,
        });

        if (!this._nxWorkspacePath) {
          await this.messageSender.notifyToolError(
            NX_RUN_GENERATOR,
            'Error: Workspace path not set',
          );
          return {
            isError: true,
            content: [{ type: 'text', text: 'Error: Workspace path not set' }],
          };
        }

        if (!this.ideClient) {
          await this.messageSender.notifyToolError(
            NX_RUN_GENERATOR,
            'No IDE client available',
          );
          return {
            isError: true,
            content: [{ type: 'text', text: 'No IDE client available' }],
          };
        }

        try {
          const logFileName = await this.ideClient.openGenerateUi(
            generatorName,
            options ?? {},
            cwd,
          );

          await this.messageSender.notifyToolCompletion(NX_RUN_GENERATOR, {
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
          await this.messageSender.notifyToolError(
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
  }
}
