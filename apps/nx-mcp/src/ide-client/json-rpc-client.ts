import {
  ConnectionStatus,
  IDE_RPC_METHODS,
  IdeClientConfig,
  OpenGenerateUiResponse,
} from '@nx-console/shared-types';
import { getNxConsoleSocketPath } from '@nx-console/shared-utils';
import { Socket } from 'net';
import { platform } from 'os';

interface JsonRpcMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * JSON-RPC client for communicating with the IDE using content-length framing
 */
export class IdeJsonRpcClient {
  private socket: Socket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private requestId = 0;
  private pendingRequests = new Map<
    string | number,
    {
      resolve: (value: any) => void;
      reject: (error: any) => void;
      timeout: NodeJS.Timeout;
    }
  >();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private buffer = '';

  constructor(private config: IdeClientConfig) {}

  /**
   * Connect to the IDE socket
   */
  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    this.status = 'connecting';

    try {
      const socketPath = getNxConsoleSocketPath(this.config.workspacePath);

      // Create socket connection
      this.socket = new Socket();

      // Set up connection handlers
      this.socket.on('connect', () => {
        this.status = 'connected';
        this.reconnectAttempts = 0;
        console.log(`Connected to IDE at ${socketPath}`);
      });

      this.socket.on('data', (data) => {
        this.handleIncomingData(data);
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
        this.handleDisconnection();
      });

      this.socket.on('close', () => {
        console.log('Socket closed');
        this.handleDisconnection();
      });

      // Connect to socket
      if (platform() === 'win32') {
        // On Windows, connect to named pipe
        this.socket.connect(socketPath);
      } else {
        // On Unix, connect to socket file
        this.socket.connect(socketPath);
      }
    } catch (error) {
      console.error('Failed to connect to IDE:', error);
      this.handleDisconnection();
      throw error;
    }
  }

  /**
   * Disconnect from the IDE
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    // Reject all pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();

    this.buffer = '';
    this.status = 'disconnected';
  }

  /**
   * Handle incoming data with content-length framing
   */
  private handleIncomingData(data: Buffer): void {
    this.buffer += data.toString();

    while (true) {
      // Look for complete messages with content-length header
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) {
        break; // No complete header yet
      }

      const headerSection = this.buffer.substring(0, headerEnd);
      const contentLengthMatch = headerSection.match(
        /content-length:\s*(\d+)/i,
      );

      if (!contentLengthMatch) {
        console.error('Invalid message format: missing content-length header');
        this.buffer = this.buffer.substring(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(contentLengthMatch[1], 10);
      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + contentLength;

      if (this.buffer.length < messageEnd) {
        break; // Message not complete yet
      }

      const messageContent = this.buffer.substring(messageStart, messageEnd);
      this.buffer = this.buffer.substring(messageEnd);

      // Remove trailing \r\n\r\n if present
      const cleanMessage = messageContent.replace(/\r\n\r\n$/, '');

      try {
        const message: JsonRpcMessage = JSON.parse(cleanMessage);
        this.handleJsonRpcMessage(message);
      } catch (error) {
        console.error(
          'Failed to parse JSON-RPC message:',
          error,
          'Content:',
          cleanMessage,
        );
      }
    }
  }

  /**
   * Handle parsed JSON-RPC message
   */
  private handleJsonRpcMessage(message: JsonRpcMessage): void {
    if (message.id !== undefined) {
      // This is a response to a request we sent
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);

        if (message.error) {
          pending.reject(
            new Error(
              `JSON-RPC Error ${message.error.code}: ${message.error.message}`,
            ),
          );
        } else {
          pending.resolve(message.result);
        }
      }
    } else {
      // This is a notification from IDE (if any)
      console.log(
        `Received notification from IDE: ${message.method}`,
        message.params,
      );
    }
  }

  /**
   * Send a JSON-RPC message with content-length framing
   */
  private sendMessage(message: JsonRpcMessage): void {
    if (!this.socket || this.status !== 'connected') {
      throw new Error('Not connected to IDE');
    }

    const messageJson = JSON.stringify(message);
    const contentLength = Buffer.byteLength(messageJson, 'utf8');
    const header = `content-length: ${contentLength}\r\n\r\n`;
    const fullMessage = header + messageJson + '\r\n\r\n';

    this.socket.write(fullMessage);
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Send a request to the IDE
   */
  private async sendRequest<T>(method: string, params?: any): Promise<T> {
    if (this.status !== 'connected' || !this.socket) {
      throw new Error('Not connected to IDE');
    }

    const id = ++this.requestId;
    const message: JsonRpcMessage = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, this.config.requestTimeout || 5000);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      try {
        this.sendMessage(message);
      } catch (error) {
        const pending = this.pendingRequests.get(id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(id);
          reject(error);
        }
      }
    });
  }

  /**
   * Handle disconnection and attempt reconnection
   */
  private handleDisconnection(): void {
    if (this.status === 'disconnected') {
      return; // Already handling disconnection
    }

    this.status = 'error';

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    // Clear buffer
    this.buffer = '';

    // Reject all pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Connection lost'));
    }
    this.pendingRequests.clear();

    // Attempt reconnection if configured
    const maxAttempts = this.config.maxReconnectAttempts || 5;
    const interval = this.config.reconnectInterval || 2000;

    if (this.reconnectAttempts < maxAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${maxAttempts})...`,
      );

      this.reconnectTimer = setTimeout(() => {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error);
          if (this.reconnectAttempts >= maxAttempts) {
            this.status = 'disconnected';
            console.error('Max reconnection attempts reached. Giving up.');
          }
        });
      }, interval);
    } else {
      this.status = 'disconnected';
      console.error('Max reconnection attempts reached. Connection lost.');
    }
  }

  /**
   * Focus on a specific project in the IDE
   */
  async focusProject(projectName: string): Promise<void> {
    await this.sendRequest<void>(IDE_RPC_METHODS.FOCUS_PROJECT, {
      projectName,
    });
  }

  /**
   * Focus on a specific task in the IDE
   */
  async focusTask(projectName: string, taskName: string): Promise<void> {
    await this.sendRequest<void>(IDE_RPC_METHODS.FOCUS_TASK, {
      projectName,
      taskName,
    });
  }

  /**
   * Show the full project graph in the IDE
   */
  async showFullProjectGraph(): Promise<void> {
    await this.sendRequest<void>(IDE_RPC_METHODS.SHOW_FULL_PROJECT_GRAPH);
  }

  /**
   * Open the generator UI in the IDE
   */
  async openGenerateUi(
    generatorName: string,
    options: Record<string, unknown>,
    cwd?: string,
  ): Promise<string> {
    const response = await this.sendRequest<OpenGenerateUiResponse>(
      IDE_RPC_METHODS.OPEN_GENERATE_UI,
      { generatorName, options, cwd },
    );
    return response.logFileName;
  }
}
