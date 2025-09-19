import {
  CancellationToken,
  McpHttpServerDefinition,
  McpServerDefinitionProvider,
  Uri,
} from 'vscode';
import { McpHttpServerCore } from './mcp-http-server-core';

/**
 * VSCode-specific MCP server definition provider
 */
export class NxMcpServerDefinitionProvider
  implements McpServerDefinitionProvider<NxMcpHttpServerDefinition>
{
  constructor(private server: McpStreamableWebServer | undefined) {}

  async provideMcpServerDefinitions(
    token: CancellationToken,
  ): Promise<NxMcpHttpServerDefinition[] | undefined> {
    if (this.server === undefined) {
      return undefined;
    }
    return [
      new NxMcpHttpServerDefinition('Nx Mcp Server', this.server.getUri()),
    ];
  }
}

/**
 * VSCode-specific MCP HTTP server definition
 */
export class NxMcpHttpServerDefinition extends McpHttpServerDefinition {
  constructor(
    label: string,
    uri: Uri,
    headers?: Record<string, string>,
    version?: string,
  ) {
    super(label, uri, headers, version);
  }
}

/**
 * VSCode-specific wrapper around the core HTTP server
 * Provides VSCode Uri type compatibility
 */
export class McpStreamableWebServer {
  private core: McpHttpServerCore;

  constructor(mcpPort: number) {
    this.core = new McpHttpServerCore(mcpPort);
  }

  /**
   * Get the URI of the server in VSCode format
   */
  public getUri(): Uri {
    return Uri.parse(this.core.getUrl());
  }

  /**
   * Stop the MCP server
   */
  public stopMcpServer() {
    this.core.stopMcpServer();
  }

  /**
   * Update the workspace path
   */
  public async updateMcpServerWorkspacePath(workspacePath: string) {
    await this.core.updateMcpServerWorkspacePath(workspacePath);
  }
}
