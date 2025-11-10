import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export class TestMCPClient {
  private client: Client;
  private transport: StreamableHTTPClientTransport | null = null;

  constructor(
    private serverUrl: string,
    clientName: string,
  ) {
    this.client = new Client({
      name: clientName,
      version: '1.0.0',
    });
  }

  async connect(): Promise<void> {
    this.transport = new StreamableHTTPClientTransport(new URL(this.serverUrl));
    await this.client.connect(this.transport);
  }

  async listTools(): Promise<any[]> {
    const result = await this.client.listTools();
    return result.tools;
  }

  async callTool(name: string, args: Record<string, any> = {}): Promise<any> {
    return await this.client.callTool({
      name,
      arguments: args,
    });
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }
}
