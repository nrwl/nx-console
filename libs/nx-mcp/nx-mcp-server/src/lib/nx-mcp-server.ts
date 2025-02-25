import { Logger } from '@nx-console/shared-utils';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GoogleAnalytics } from '@nx-console/shared-telemetry';
import {
  getDocsContext,
  getDocsPrompt,
  getGeneratorNamesAndDescriptions,
  getGeneratorSchema,
  getGeneratorsPrompt,
  getNxJsonPrompt,
  getProjectGraphPrompt,
} from '@nx-console/shared-llm-context';
import { z } from 'zod';
import { checkIsNxWorkspace } from '@nx-console/shared-npm';
import { getMcpLogger } from './mcp-logger';
import {
  getGenerators,
  nxWorkspace,
} from '@nx-console/shared-nx-workspace-info';

export function createNxMcpServer(
  nxWorkspacePath: string,
  telemetry?: GoogleAnalytics,
): McpServer {
  const server = new McpServer({
    name: 'Nx MCP',
    version: '0.0.1',
  });
  server.server.registerCapabilities({
    logging: {},
  });

  const logger = getMcpLogger(server);

  server.tool(
    'nx_workspace',
    'Returns a readable representation of the nx project graph and the nx.json that configures nx. Use it to answer questions about the nx workspace and architecture',
    async () => {
      telemetry?.sendEventData('ai.tool-call', {
        tool: 'nx_workspace',
      });
      try {
        if (!(await checkIsNxWorkspace(nxWorkspacePath))) {
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

        const workspace = await nxWorkspace(nxWorkspacePath, logger);
        return {
          content: [
            {
              type: 'text',
              text: getNxJsonPrompt(workspace.nxJson),
            },
            {
              type: 'text',
              text: getProjectGraphPrompt(workspace.projectGraph),
            },
          ],
        };
      } catch (e) {
        return {
          content: [{ type: 'text', text: String(e) }],
        };
      }
    },
  );

  server.tool(
    'nx_project_details',
    'Returns the complete project configuration in JSON format for a given nx project.',
    {
      projectName: z.string(),
    },
    async ({ projectName }) => {
      telemetry?.sendEventData('ai.tool-call', {
        tool: 'nx_project_details',
      });
      const workspace = await nxWorkspace(nxWorkspacePath, logger);
      const project = workspace.projectGraph.nodes[projectName];

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
    'nx_docs',
    'Returns a list of documentation sections that could be relevant to the user query. Use it to learn about nx, its configuration and options instead of assuming knowledge about it.',
    {
      userQuery: z.string(),
    },
    async ({ userQuery }: { userQuery: string }) => {
      telemetry?.sendEventData('ai.tool-call', {
        tool: 'nx_docs',
      });
      const docsPages = await getDocsContext(userQuery);
      return {
        content: [{ type: 'text', text: getDocsPrompt(docsPages) }],
      };
    },
  );

  server.tool(
    'nx_generators',
    'Returns a list of generators that could be relevant to the user query.',
    async () => {
      telemetry?.sendEventData('ai.tool-call', {
        tool: 'nx_generators',
      });
      const generators = await getGenerators(
        nxWorkspacePath,
        undefined,
        logger,
      );

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

  server.tool(
    'nx_generator_schema',
    'Returns the detailed JSON schema for an nx generator',
    {
      generatorName: z.string(),
    },
    async ({ generatorName }) => {
      telemetry?.sendEventData('ai.tool-call', {
        tool: 'nx_generator_schema',
      });
      const generators = await getGenerators(
        nxWorkspacePath,
        undefined,
        logger,
      );
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

  return server;
}
