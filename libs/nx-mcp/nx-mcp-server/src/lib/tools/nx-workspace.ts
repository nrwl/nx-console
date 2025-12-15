import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  detectAtomizedTargets,
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
import { getMessageForError, Logger } from '@nx-console/shared-utils';
import { readFile } from 'fs/promises';
import path from 'path';
import z from 'zod';
import { NxWorkspaceInfoProvider } from '../nx-mcp-server-wrapper';
import { isToolEnabled } from '../tool-filter';
import {
  nxProjectDetailsOutputSchema,
  nxWorkspaceOutputSchema,
  NxWorkspaceOutput,
  NxProjectDetailsOutput,
} from './output-schemas';

let nxWorkspacePath: string | undefined = undefined;

const PROJECT_DETAILS_CHUNK_SIZE = 10000;

export function setNxWorkspacePath(path: string) {
  nxWorkspacePath = path;
}

/**
 * Get a value from an object using a dot-notation path string.
 * Supports dot notation (foo.bar) and array indices (foo.bar[0] or foo.bar.0).
 *
 * @param obj - The object to traverse
 * @param path - The path string (e.g., "targets.build.inputs" or "targets.build.options.assets[0]")
 * @returns The value at the path, or undefined if the path doesn't exist
 */
function getValueByPath(obj: any, path: string): any {
  // Convert bracket notation to dot notation: foo[0] -> foo.0
  const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');

  // Split on dots and filter out empty strings
  const keys = normalizedPath.split('.').filter((key) => key.length > 0);

  // Traverse the object
  return keys.reduce((current, key) => {
    if (current === null || current === undefined) {
      return undefined;
    }
    return current[key];
  }, obj);
}

/**
 * Compress a target configuration into a human-readable plain text description.
 * Shows executor/command, dependencies, and cache status in token-efficient format.
 *
 * @param name - The target name
 * @param config - The target configuration object
 * @param atomizedTargets - Optional array of atomized target names for this root target
 * @returns Plain text description of the target
 */
function compressTargetForDisplay(
  name: string,
  config: any,
  atomizedTargets?: string[],
): string {
  let description = `${name}: `;

  // Determine executor/command display
  const executor = config.executor;
  if (!executor) {
    description += 'no executor';
  } else if (executor === 'nx:run-commands') {
    const command = config.command ?? config.options?.command;
    const commands = config.options?.commands;

    if (command) {
      description += `nx:run-commands - '${command}'`;
    } else if (commands && Array.isArray(commands)) {
      if (commands.length === 1) {
        const cmd =
          typeof commands[0] === 'string' ? commands[0] : commands[0].command;
        description += `nx:run-commands - '${cmd}'`;
      } else {
        description += `nx:run-commands - ${commands.length} commands`;
      }
    } else {
      description += 'nx:run-commands';
    }
  } else if (executor === 'nx:run-script') {
    const command = config.metadata?.runCommand;
    const script = config.metadata?.scriptContent;

    if (command) {
      description += `nx:run-script - '${command}'`;
    } else if (script) {
      description += `nx:run-script - '${script}'`;
    } else {
      description += 'nx:run-script';
    }
  } else {
    description += executor;
  }

  // Add dependsOn if present
  if (
    config.dependsOn &&
    Array.isArray(config.dependsOn) &&
    config.dependsOn.length > 0
  ) {
    const deps = config.dependsOn
      .map((dep: any) => (typeof dep === 'string' ? dep : dep.target))
      .filter(Boolean);

    if (deps.length > 0) {
      // If this is a root atomizer target, simplify the dependency display
      if (atomizedTargets && atomizedTargets.length > 0) {
        description += ` | depends: [${atomizedTargets.length} atomized targets]`;
      } else if (deps.length > 10) {
        // Truncate long dependency lists
        const firstThree = deps.slice(0, 3).join(', ');
        description += ` | depends: [${firstThree}, +${deps.length - 3} more]`;
      } else {
        description += ` | depends: [${deps.join(', ')}]`;
      }
    }
  }

  // Only show cache status if it's false (assume true by default)
  const cacheEnabled = config.cache !== false;
  if (!cacheEnabled) {
    description += ` | cache: false`;
  }

  // Add atomized targets list if this is a root atomizer target
  if (atomizedTargets && atomizedTargets.length > 0) {
    // Strip the prefix from atomized target names for more compact display
    const strippedNames = atomizedTargets.map((target) =>
      target.replace(`${name}--`, ''),
    );

    if (strippedNames.length <= 5) {
      description += ` | atomized: [${strippedNames.join(', ')}]`;
    } else {
      const firstThree = strippedNames.slice(0, 3).join(', ');
      description += ` | atomized: [${firstThree}, +${strippedNames.length - 3} more]`;
    }
  }

  return description;
}

export function chunkContent(
  content: string,
  pageNumber: number,
  chunkSize: number,
): {
  chunk: string;
  hasMore: boolean;
} {
  if (!content) {
    return {
      chunk: '',
      hasMore: false,
    };
  }
  const startIndex = pageNumber * chunkSize;
  if (startIndex >= content.length) {
    return {
      chunk: `no more content on page ${pageNumber}`,
      hasMore: false,
    };
  }

  const endIndex = startIndex + chunkSize;

  return {
    chunk:
      content.slice(startIndex, endIndex) +
      (endIndex < content.length
        ? `\n...[truncated, continue on page ${pageNumber + 1}]`
        : ''),
    hasMore: endIndex < content.length,
  };
}

export function registerNxWorkspaceTools(
  workspacePath: string,
  server: McpServer,
  logger: Logger,
  nxWorkspaceInfoProvider: NxWorkspaceInfoProvider,
  telemetry?: NxConsoleTelemetryLogger,
  toolsFilter?: string[],
): void {
  nxWorkspacePath = workspacePath;

  if (!isToolEnabled(NX_WORKSPACE, toolsFilter)) {
    logger.debug?.(`Skipping ${NX_WORKSPACE} - disabled by tools filter`);
  } else {
    server.registerTool(
      NX_WORKSPACE,
      {
        description:
          'Returns a readable representation of the nx project graph and the nx.json that configures nx. If there are project graph errors, it also returns them. Use it to answer questions about the nx workspace and architecture.',
        inputSchema: {
          filter: z
            .string()
            .optional()
            .describe(
              'Filter which projects to include in the text content output. ' +
                'Note: structuredContent always returns all projects. ' +
                'Supports patterns like: project names (app1,app2), glob patterns (*-app), ' +
                'tags (tag:api, tag:type:*), directory patterns (apps/*), and exclusions (!tag:e2e). ' +
                'Multiple patterns can be combined with commas.',
            ),
          select: z
            .string()
            .optional()
            .describe(
              'Path to select specific properties in text content output. ' +
                'Note: structuredContent always returns full project data. ' +
                'Supports dot notation (e.g., "targets.build") and array indices (e.g., "tags[0]"). ' +
                'When provided, returns JSON format with selected properties for each matching project. ' +
                'When not provided, returns compressed serialized format.',
            ),
          pageToken: z
            .number()
            .optional()
            .describe(
              'Token for pagination of text content (0-based page number). ' +
                'Note: structuredContent is not paginated. ' +
                'If not provided, returns page 0. Pass the token from the previous response to get the next page.',
            ),
        },
        outputSchema: nxWorkspaceOutputSchema,
        annotations: {
          destructiveHint: false,
          readOnlyHint: true,
          openWorldHint: false,
        },
      },
      async ({ filter, select, pageToken }) => {
        telemetry?.logUsage('ai.tool-call', {
          tool: NX_WORKSPACE,
        });
        try {
          if (!workspacePath) {
            return {
              isError: true,
              content: [
                { type: 'text', text: 'Error: Workspace path not set' },
              ],
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

          // Build structuredContent from full workspace (ignores filter/select)
          // Cast to unknown first to satisfy TypeScript's strict index signature checks
          const structuredContent = {
            projects: Object.entries(workspace.projectGraph.nodes).map(
              ([name, node]) => ({
                name,
                ...node.data,
              }),
            ),
            dependencies: workspace.projectGraph.dependencies,
            nxJson: workspace.nxJson as Record<string, unknown> | undefined,
            errors: workspace.errors?.map((e) => ({
              message: getMessageForError(e),
            })),
          } as NxWorkspaceOutput;

          // For text content, apply filter if provided
          let filteredWorkspace = workspace;
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

          const pageNumber = pageToken ?? 0;
          let outputContent: string;

          // Handle select parameter - return JSON format for text content
          if (select) {
            const projectResults: Array<{ projectName: string; value: any }> =
              [];

            for (const [projectName, projectNode] of Object.entries(
              filteredWorkspace.projectGraph.nodes,
            )) {
              // Apply select path to project.data for consistency with nx_project_details
              const value = getValueByPath(projectNode.data, select);
              // Use null instead of undefined so it appears in JSON output
              projectResults.push({ projectName, value: value ?? null });
            }

            outputContent = JSON.stringify(projectResults, null, 2);
          } else {
            // No select - use compressed serialized format with token optimization
            const results = getTokenOptimizedToolResult(filteredWorkspace);
            outputContent = results.filter((result) => !!result).join('\n\n');
          }

          // Apply pagination to text content
          const { chunk, hasMore } = chunkContent(
            outputContent,
            pageNumber,
            PROJECT_DETAILS_CHUNK_SIZE,
          );

          const content: CallToolResult['content'] = [
            {
              type: 'text',
              text: chunk,
            },
          ];

          // Add pagination token if there's more content
          if (hasMore) {
            content.push({
              type: 'text',
              text: `Next page token: ${pageNumber + 1}. Call this tool again with the next page token to continue retrieving workspace data.`,
            });
          }

          return {
            content,
            structuredContent,
          };
        } catch (e) {
          return {
            isError: true,
            content: [{ type: 'text', text: String(e) }],
          };
        }
      },
    );
  }

  if (!isToolEnabled(NX_WORKSPACE_PATH, toolsFilter)) {
    logger.debug?.(`Skipping ${NX_WORKSPACE_PATH} - disabled by tools filter`);
  } else {
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
  }

  if (!isToolEnabled(NX_PROJECT_DETAILS, toolsFilter)) {
    logger.debug?.(`Skipping ${NX_PROJECT_DETAILS} - disabled by tools filter`);
  } else {
    server.registerTool(
      NX_PROJECT_DETAILS,
      {
        description:
          'Returns the project configuration for a specific Nx project. When called without a select parameter, targets are shown in a compressed plain-text format (executor/command, dependencies, cache status) to optimize token usage, while all other configuration (metadata, project dependencies, external dependencies) is shown in full JSON. Use the select parameter with dot notation to access complete unabridged configuration for specific paths (e.g., select="targets.build" for full build target config including all options, inputs, outputs). This tool is ideal for: understanding what targets are available and how to run them, viewing project metadata and relationships, then drilling into specific target details as needed. For large projects, results are paginated - if a pagination token is returned, call this tool again with the same parameters plus the token to retrieve additional results.',
        inputSchema: {
          projectName: z
            .string()
            .describe('The name of the project to get details for'),
          select: z
            .string()
            .optional()
            .describe(
              'Path to select specific properties in text content output. ' +
                'Note: structuredContent always returns full project data. ' +
                'Supports dot notation (e.g., "targets.build.inputs") and array indices (e.g., "targets.build.options.assets[0]"). ' +
                'When provided, only the value at this path will be returned in text content. ' +
                'If select is set, dependencies and external dependencies will not be included in the text content response.',
            ),
          pageToken: z
            .number()
            .optional()
            .describe(
              'Token for pagination of text content. ' +
                'Note: structuredContent is not paginated. ' +
                'Pass the token from the previous response to get the next page.',
            ),
        },
        outputSchema: nxProjectDetailsOutputSchema,
        annotations: {
          destructiveHint: false,
          readOnlyHint: true,
          openWorldHint: false,
        },
      },
      async ({ projectName, select, pageToken }) => {
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

        // Build structuredContent from full project data (ignores select)
        const dependencies =
          workspace.projectGraph.dependencies[project.name] || [];
        const projectDependencies: string[] = [];
        const externalDependencies: string[] = [];

        for (const dep of dependencies) {
          if (workspace.projectGraph.externalNodes?.[dep.target]) {
            externalDependencies.push(dep.target);
          } else {
            projectDependencies.push(dep.target);
          }
        }

        const structuredContent = {
          name: project.name,
          ...project.data,
          projectDependencies,
          externalDependencies,
        } as NxProjectDetailsOutput;

        // For text content, handle select and pagination
        const pageNumber = pageToken ?? 0;

        let detailsJson: any;
        let compressedTargetsText: string | undefined;

        if (select) {
          // When select is provided, return unabridged data at that path for text content
          detailsJson = getValueByPath(project.data, select);

          // Handle selected value not found
          if (detailsJson === undefined) {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Path "${select}" not found in project configuration`,
                },
              ],
            };
          }
        } else {
          // No select: compress targets into plain text, return rest as JSON
          const { targets, ...projectDataWithoutTargets } = project.data;
          detailsJson = projectDataWithoutTargets;

          if (targets && typeof targets === 'object') {
            // Detect atomized targets
            const { atomizedTargetsMap, targetsToExclude } =
              detectAtomizedTargets(targets);

            // Create compressed descriptions for visible targets only
            const targetDescriptions = Object.entries(targets)
              .filter(([name]) => !targetsToExclude.includes(name))
              .map(([name, config]) => {
                const atomizedTargets = atomizedTargetsMap.get(name);
                return `  - ${compressTargetForDisplay(name, config, atomizedTargets)}`;
              })
              .join('\n');

            // Pick a sample target name for the example
            const sampleTargetName = Object.keys(targets)[0] ?? 'build';

            compressedTargetsText = `Available Targets (compressed view):
To see full configuration for a specific target, call this tool again with select='targets.TARGET_NAME'
Example: select='targets.${sampleTargetName}' for the ${sampleTargetName} target

${targetDescriptions}`;
          }
        }

        const projDepsStr = projectDependencies.join(', ');
        const extDepsStr = externalDependencies.join(', ');

        // Chunk each section for text content pagination
        const detailsChunk = chunkContent(
          JSON.stringify(detailsJson, null, 2),
          pageNumber,
          PROJECT_DETAILS_CHUNK_SIZE,
        );
        const projDepsChunk = chunkContent(
          projDepsStr,
          pageNumber,
          PROJECT_DETAILS_CHUNK_SIZE,
        );
        const extDepsChunk = chunkContent(
          extDepsStr,
          pageNumber,
          PROJECT_DETAILS_CHUNK_SIZE,
        );

        // Build content blocks
        const content: CallToolResult['content'] = [];

        const continuedString = pageNumber > 0 ? ' (continued)' : '';
        if (detailsChunk.chunk) {
          content.push({
            type: 'text',
            text: `Project Details${continuedString}: \n${detailsChunk.chunk}`,
          });
        }

        // Add compressed targets text if no select and on first page only (not on continuation pages)
        if (!select && compressedTargetsText && pageNumber === 0) {
          content.push({
            type: 'text',
            text: compressedTargetsText,
          });
        }

        if (!select && projDepsChunk.chunk) {
          content.push({
            type: 'text',
            text: `Project Dependencies${continuedString}: \n${projDepsChunk.chunk}`,
          });
        }

        if (!select && extDepsChunk.chunk) {
          content.push({
            type: 'text',
            text: `External Dependencies${continuedString}: \n${extDepsChunk.chunk}`,
          });
        }

        // Add pagination token if any section has more
        if (
          detailsChunk.hasMore ||
          (!select && (projDepsChunk.hasMore || extDepsChunk.hasMore))
        ) {
          content.push({
            type: 'text',
            text: `Next page token: ${pageNumber + 1}. Call this tool again with the next page token to continue retrieving project details.`,
          });
        }

        return { content, structuredContent };
      },
    );
  }

  if (!isToolEnabled(NX_GENERATORS, toolsFilter)) {
    logger.debug?.(`Skipping ${NX_GENERATORS} - disabled by tools filter`);
  } else {
    server.tool(
      NX_GENERATORS,
      "Returns a complete list of all available Nx generators in the workspace, including both plugin-provided generators (like @nx/react:component) and local workspace generators. The output shows each generator's name with its description, useful for discovering what generators exist or finding one that matches a specific need.",
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
  }

  if (!isToolEnabled(NX_GENERATOR_SCHEMA, toolsFilter)) {
    logger.debug?.(
      `Skipping ${NX_GENERATOR_SCHEMA} - disabled by tools filter`,
    );
  } else {
    server.tool(
      NX_GENERATOR_SCHEMA,
      "Returns the complete JSON schema for a specific Nx generator. The schema contains all available options with their types, descriptions, default values, validation rules, and whether they're required or optional. Many generators also include helpful examples showing common usage patterns. The tool automatically handles generator aliases (e.g., 'app' vs 'application').",
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
  }

  logger.debug?.('Registered Nx workspace tool');
}

export function getTokenOptimizedToolResult(
  workspace: NxWorkspace,
  maxTokens = 10000,
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

// Export for testing
export const __testing__ = {
  compressTargetForDisplay,
};
