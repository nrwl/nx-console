import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getDocsContext,
  getDocsPrompt,
  getGeneratorNamesAndDescriptions,
  getGeneratorSchema,
  getGeneratorsPrompt,
  getPluginsInformation,
  NX_AVAILABLE_PLUGINS,
  NX_DOCS,
  NX_GENERATOR_SCHEMA,
  NX_GENERATORS,
  NX_PROJECT_DETAILS,
  NX_WORKSPACE_PATH,
} from '@nx-console/shared-llm-context';
import { findMatchingProject } from '@nx-console/shared-npm';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { Logger } from '@nx-console/shared-utils';
import { z } from 'zod';
import { NxWorkspaceInfoProvider } from '../nx-mcp-server';
import { readFile } from 'fs/promises';
import path from 'path';
import { NxVersion } from '@nx-console/nx-version';
import { GeneratorCollectionInfo } from '@nx-console/shared-schema';
import { NxWorkspace } from '@nx-console/shared-types';

/**
 * Register core Nx tools that are always available regardless of workspace/IDE state
 */
export function registerNxCoreTools(
  server: McpServer,
  logger: Logger,
  nxWorkspaceInfoProvider: NxWorkspaceInfoProvider,
  telemetry?: NxConsoleTelemetryLogger,
  nxWorkspacePath?: string,
): void {
  // NX_DOCS - always available for documentation
  server.tool(
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
      telemetry?.logUsage('ai.tool-call', {
        tool: NX_DOCS,
      });
      const docsPages = await getDocsContext(userQuery);
      return {
        content: [{ type: 'text', text: getDocsPrompt(docsPages) }],
      };
    },
  );

  // NX_AVAILABLE_PLUGINS - always available
  server.tool(
    NX_AVAILABLE_PLUGINS,
    'Returns a list of available Nx plugins from the core team as well as local workspace Nx plugins.',
    {
      destructiveHint: false,
      readOnlyHint: true,
      openWorldHint: true,
    },
    async () => {
      telemetry?.logUsage('ai.tool-call', {
        tool: NX_AVAILABLE_PLUGINS,
      });

      let nxVersion: NxVersion | undefined = undefined;
      let nxWorkspace: NxWorkspace | undefined = undefined;
      const workspacePath: string | undefined = nxWorkspacePath;

      if (nxWorkspacePath) {
        nxWorkspace = await nxWorkspaceInfoProvider.nxWorkspace(
          nxWorkspacePath,
          logger,
        );
        nxVersion = nxWorkspace?.nxVersion;
      }

      const pluginsInfo = await getPluginsInformation(
        nxVersion,
        workspacePath,
        nxWorkspace,
        logger,
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

  // Workspace-dependent tools (but we register them with proper error handling)
  server.tool(
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

      return {
        content: [
          { type: 'text', text: JSON.stringify(project.data, null, 2) },
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

  logger.log('Registered Nx core tools');
}