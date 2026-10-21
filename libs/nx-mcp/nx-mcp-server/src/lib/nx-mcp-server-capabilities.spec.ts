import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { McpServer, ServerCapabilities } from '@modelcontextprotocol/server';
import {
  NxMcpServerWrapper,
  NxWorkspaceInfoProvider,
  nxMcpServerCapabilities,
} from './nx-mcp-server-wrapper';

const logger = { log: jest.fn(), debug: jest.fn() };

async function connect(
  capabilities: ServerCapabilities = nxMcpServerCapabilities,
) {
  const server = new McpServer(
    { name: 'Nx MCP', version: '0.0.1' },
    { capabilities },
  );
  new NxMcpServerWrapper(
    undefined,
    {} as NxWorkspaceInfoProvider,
    server,
    undefined,
    undefined,
    logger,
  );
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(clientTransport);
  return { server, client };
}

describe('nx-mcp server capabilities', () => {
  it('answers resources/list and resources/templates/list when it advertises resources', async () => {
    const { client } = await connect();

    expect(client.getServerCapabilities()?.resources).toBeDefined();
    await expect(client.listResources()).resolves.toMatchObject({
      resources: [],
    });
    await expect(client.listResourceTemplates()).resolves.toMatchObject({
      resourceTemplates: [],
    });

    await client.close();
  });

  it('does not advertise resources on a server that cannot list them', async () => {
    const { client } = await connect({ tools: { listChanged: true } });

    expect(client.getServerCapabilities()?.resources).toBeUndefined();

    await client.close();
  });

  it('lists a resource registered after the client connected', async () => {
    const { server, client } = await connect();

    server.registerResource(
      'cipe',
      'nx-cloud://cipes/1',
      { mimeType: 'text/plain' },
      async (uri) => ({ contents: [{ uri: uri.href, text: 'cipe' }] }),
    );

    await expect(client.listResources()).resolves.toMatchObject({
      resources: [{ uri: 'nx-cloud://cipes/1', name: 'cipe' }],
    });

    await client.close();
  });
});
