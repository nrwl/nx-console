import {
  McpHttpServerCore,
  McpHttpServerCoreOptions,
} from './mcp-http-server-core';

/**
 * Cursor-specific wrapper around the core HTTP server
 * No VSCode type dependencies - uses plain strings for URLs
 */
export class McpCursorServer {
  private core: McpHttpServerCore;

  constructor(mcpPort: number, options: McpHttpServerCoreOptions = {}) {
    this.core = new McpHttpServerCore(mcpPort, options);
  }

  /**
   * Get the URL of the server as a plain string for Cursor
   */
  public getUrl(): string {
    return this.core.getUrl();
  }

  /**
   * Get the port number
   */
  public getPort(): number {
    return this.core.getPort();
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
