import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  getGeneratorNamesAndDescriptions,
  getGeneratorSchema,
  getGeneratorsPrompt,
  getNxJsonPrompt,
  getProjectGraphErrorsPrompt,
  getProjectGraphPrompt,
  NX_GENERATOR_SCHEMA,
  NX_GENERATORS,
  NX_PROJECT_DETAILS,
  NX_WORKSPACE,
  NX_WORKSPACE_PATH,
} from '@nx-console/shared-llm-context';
import {
  checkIsNxWorkspace,
  findMatchingProject,
  findMatchingProjects,
} from '@nx-console/shared-npm';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { NxWorkspace } from '@nx-console/shared-types';
import { Logger } from '@nx-console/shared-utils';
import { readFile } from 'fs/promises';
import path from 'path';
import z from 'zod';
import { NxWorkspaceInfoProvider } from '../nx-mcp-server-wrapper';

let nxWorkspacePath: string | undefined = undefined;

export function setNxWorkspacePath(path: string) {
  nxWorkspacePath = path;
}

export function registerNxWorkspaceTools(
  workspacePath: string,
  server: McpServer,
  logger: Logger,
  nxWorkspaceInfoProvider: NxWorkspaceInfoProvider,
  telemetry?: NxConsoleTelemetryLogger,
): void {
  nxWorkspacePath = workspacePath;

  server.tool(
    NX_WORKSPACE,
    'Returns a readable representation of the nx project graph and the nx.json that configures nx. If there are project graph errors, it also returns them. Use it to answer questions about the nx workspace and architecture',
    {
      filter: z
        .string()
        .optional()
        .describe(
          'Optional filter to select specific projects. Supports patterns like: project names (app1,app2), glob patterns (*-app), tags (tag:api, tag:type:*), directory patterns (apps/*), and exclusions (!tag:e2e). Multiple patterns can be combined with commas.',
        ),
    },
    {
      destructiveHint: false,
      readOnlyHint: true,
      openWorldHint: false,
    },
    async ({ filter }) => {
      telemetry?.logUsage('ai.tool-call', {
        tool: NX_WORKSPACE,
      });
      try {
        if (!workspacePath) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Error: Workspace path not set' }],
          };
        }
        if (!(await checkIsNxWorkspace(workspacePath))) {
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

        const workspace = await nxWorkspaceInfoProvider.nxWorkspace(
          workspacePath,
          logger,
        );
        if (!workspace) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Error: Workspace not found' }],
          };
        }
        let filteredWorkspace = workspace;

        // Apply filter if provided
        if (filter && workspace.projectGraph) {
          const filterPatterns = filter.split(',').map((p) => p.trim());
          const matchingProjectNames = await findMatchingProjects(
            filterPatterns,
            workspace.projectGraph.nodes,
            workspacePath,
          );

          // Create a filtered project graph
          const filteredNodes: typeof workspace.projectGraph.nodes = {};
          const filteredDeps: typeof workspace.projectGraph.dependencies = {};

          for (const projectName of matchingProjectNames) {
            filteredNodes[projectName] =
              workspace.projectGraph.nodes[projectName];
            filteredDeps[projectName] =
              workspace.projectGraph.dependencies[projectName] || [];
          }

          filteredWorkspace = {
            ...workspace,
            projectGraph: {
              ...workspace.projectGraph,
              nodes: filteredNodes,
              dependencies: filteredDeps,
            },
          };
        }

        const results = getTokenLimitedToolResult(filteredWorkspace);
        const content: CallToolResult['content'] = results
          .filter((result) => !!result)
          .map((result) => ({
            type: 'text',
            text: result,
          }));

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

  // NX_WORKSPACE_PATH - always available (returns path or message if not set)
  server.tool(
    NX_WORKSPACE_PATH,
    'Returns the path to the Nx workspace root',
    {
      readOnlyHint: true,
    },
    async () => {
      telemetry?.logUsage('ai.tool-call', {
        tool: NX_WORKSPACE_PATH,
      });

      return {
        content: [
          {
            type: 'text',
            text: nxWorkspacePath ?? 'No workspace path set',
          },
        ],
      };
    },
  );

  server.tool(
    NX_PROJECT_DETAILS,
    'Returns the complete, unabridged project configuration in JSON format for a specific Nx project. Use this tool whenever you work with a specific project or need detailed information about how to build, test, or run a specific project, understand its relationships with other projects, or access any project-specific configuration. This provides much more detail than the summarized view from nx_workspace. This includes: all targets with their full configuration (executors, options, dependencies, caching, inputs/outputs), project metadata (type, tags, owners, description, package info) and more. It also includes a list of dependencies (both projects inside the monorepo and external dependencies).',
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
      telemetry?.logUsage('ai.tool-call', {
        tool: NX_PROJECT_DETAILS,
      });
      if (!nxWorkspacePath) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Error: Workspace path not set' }],
        };
      }
      const workspace = await nxWorkspaceInfoProvider.nxWorkspace(
        nxWorkspacePath,
        logger,
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
        nxWorkspacePath,
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

      const dependencies = workspace.projectGraph.dependencies[project.name];

      const projectDependencies = [];
      const externalDependencies = [];

      for (const dep of dependencies) {
        if (workspace.projectGraph.externalNodes?.[dep.target]) {
          externalDependencies.push(dep.target);
        } else {
          projectDependencies.push(dep.target);
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `Project Details: ${JSON.stringify(project.data, null, 2)}`,
          },
          {
            type: 'text',
            text: `Project Dependencies: ${projectDependencies.join(', ')}`,
          },
          {
            type: 'text',
            text: `External Dependencies: ${externalDependencies.join(', ')}`,
          },
        ],
      };
    },
  );

  server.tool(
    NX_GENERATORS,
    'Returns a list of generators that could be relevant to the user query.',
    {
      destructiveHint: false,
      readOnlyHint: true,
      openWorldHint: false,
    },
    async () => {
      telemetry?.logUsage('ai.tool-call', {
        tool: NX_GENERATORS,
      });
      if (!nxWorkspacePath) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Error: Workspace path not set' }],
        };
      }
      const generators = await nxWorkspaceInfoProvider.getGenerators(
        nxWorkspacePath,
        undefined,
        logger,
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

  server.tool(
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
      telemetry?.logUsage('ai.tool-call', {
        tool: NX_GENERATOR_SCHEMA,
      });
      if (!nxWorkspacePath) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Error: Workspace path not set' }],
        };
      }
      const generators = await nxWorkspaceInfoProvider.getGenerators(
        nxWorkspacePath,
        undefined,
        logger,
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
              Follow up by using the nx_run_generator tool if IDE is available, otherwise use CLI commands. When generating libraries, apps or components, use the cwd option to specify the parent directory where you want to create the item.
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

  logger.log('Registered Nx workspace tool');
}

export function getTokenLimitedToolResult(
  workspace: NxWorkspace,
  maxTokens = 25000,
): string[] {
  const nxJsonResult = getNxJsonPrompt(workspace.nxJson);
  let projectGraphResult =
    Object.keys(workspace.projectGraph.nodes).length > 0
      ? getProjectGraphPrompt(workspace.projectGraph)
      : '';
  const errorsResult = workspace.errors
    ? getProjectGraphErrorsPrompt(workspace.errors, !!workspace.isPartial)
    : '';

  const getEstimatedTokenCount = () => {
    return (
      (nxJsonResult.length + projectGraphResult.length + errorsResult.length) /
      3
    );
  };

  let optimizationCounter = 0;
  while (getEstimatedTokenCount() >= maxTokens && optimizationCounter <= 2) {
    switch (optimizationCounter) {
      case 0:
        projectGraphResult = getProjectGraphPrompt(workspace.projectGraph, {
          skipOwners: true,
          skipTechnologies: true,
        });
        break;
      case 1:
        projectGraphResult = getProjectGraphPrompt(workspace.projectGraph, {
          skipOwners: true,
          skipTechnologies: true,
          truncateTargets: true,
        });
        break;
      case 2:
        projectGraphResult = getProjectGraphPrompt(workspace.projectGraph, {
          skipOwners: true,
          skipTechnologies: true,
          skipTags: true,
          truncateTargets: true,
        });
        break;
      default:
        break;
    }
    optimizationCounter++;
  }

  return [nxJsonResult, projectGraphResult, errorsResult];
}
