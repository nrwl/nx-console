import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { checkIsNxWorkspace } from '@nx-console/shared-npm';
import {
  getGenerators,
  nxWorkspace,
} from '@nx-console/shared-nx-workspace-info';
import {
  getDocsContext,
  getDocsPrompt,
  getGeneratorNamesAndDescriptions,
  getGeneratorSchema,
  getGeneratorsPrompt,
  getNxJsonPrompt,
  getProjectGraphPrompt,
} from '@nx-console/shared-llm-context';
import { getMcpLogger } from './mcp-logger';
import { z } from 'zod';

const nxWorkspacePath = process.argv[2];
if (!nxWorkspacePath) {
  console.error('Please provide a workspace root as the first argument');
  process.exit(1);
}

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
  'nx_docs',
  'Returns a list of documentation sections that could be relevant to the user query. Use it to learn about nx, its configuration and options instead of assuming knowledge about it.',
  {
    userQuery: z.string(),
    lastAssistantMessage: z.string().optional(),
  },
  async ({
    userQuery,
    lastAssistantMessage,
  }: {
    userQuery: string;
    lastAssistantMessage: string;
  }) => {
    const docsPages = await getDocsContext(userQuery, lastAssistantMessage);
    return {
      content: [{ type: 'text', text: getDocsPrompt(docsPages) }],
    };
  },
);

server.tool(
  'nx_generators',
  'Returns a list of generators that could be relevant to the user query.',
  async () => {
    const generators = await getGenerators(nxWorkspacePath, undefined, logger);

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
    const generators = await getGenerators(nxWorkspacePath, undefined, logger);
    const generatorDetails = await getGeneratorSchema(
      generatorName,
      generators,
    );

    return {
      content: [
        {
          type: 'text',
          text: `Found generator schema for ${generatorName}: ${JSON.stringify(
            generatorDetails,
          )}`,
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
server.connect(transport);
