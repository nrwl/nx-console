import { IIdeJsonRpcClient } from '@nx-console/shared-types';

/**
 * Event types for MCP tool invocations
 */
export interface McpToolEvent {
  type: 'tool-invocation' | 'tool-completion' | 'tool-error';
  toolName: string;
  timestamp: string;
  data?: any;
  error?: string;
}

/**
 * Utility class for sending messages from MCP server to IDE
 */
export class McpIdeMessageSender {
  constructor(
    private ideClient?: IIdeJsonRpcClient,
    private isIdeAvailable = false,
  ) {}

  /**
   * Send a tool invocation notification to the IDE
   */
  async notifyToolInvocation(
    toolName: string,
    parameters?: any,
  ): Promise<void> {
    if (!this.canSendMessages()) {
      return;
    }

    const event: McpToolEvent = {
      type: 'tool-invocation',
      toolName,
      timestamp: new Date().toISOString(),
      data: parameters,
    };

    await this.sendEvent(event);
  }

  /**
   * Send a tool completion notification to the IDE
   */
  async notifyToolCompletion(toolName: string, result?: any): Promise<void> {
    if (!this.canSendMessages()) {
      return;
    }

    const event: McpToolEvent = {
      type: 'tool-completion',
      toolName,
      timestamp: new Date().toISOString(),
      data: result,
    };

    await this.sendEvent(event);
  }

  /**
   * Send a tool error notification to the IDE
   */
  async notifyToolError(
    toolName: string,
    error: string | Error,
  ): Promise<void> {
    if (!this.canSendMessages()) {
      return;
    }

    const event: McpToolEvent = {
      type: 'tool-error',
      toolName,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : error,
    };

    await this.sendEvent(event);
  }

  /**
   * Check if we can send messages to the IDE
   */
  private canSendMessages(): boolean {
    return this.isIdeAvailable && this.ideClient !== undefined;
  }

  /**
   * Send an event to the IDE via JSON-RPC notification
   */
  private async sendEvent(event: McpToolEvent): Promise<void> {
    if (!this.ideClient) {
      return;
    }

    try {
      // Send the event as a JSON-RPC notification to the IDE
      await this.ideClient.sendNotification('mcp/toolEvent', event);
      console.log(`Sent MCP event: ${event.type} for tool ${event.toolName}`);
    } catch (error) {
      console.log('Failed to send MCP event to IDE:', error);
    }
  }

  /**
   * Update the IDE client and availability status
   */
  updateIdeConnection(
    ideClient?: IIdeJsonRpcClient,
    isAvailable = false,
  ): void {
    this.ideClient = ideClient;
    this.isIdeAvailable = isAvailable;
  }
}
