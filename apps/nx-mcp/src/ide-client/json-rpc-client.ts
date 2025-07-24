import {
  ConnectionStatus,
  IDE_RPC_METHODS,
  IdeClientConfig,
  OpenGenerateUiResponse,
  IIdeJsonRpcClient,
} from '@nx-console/shared-types';
import { getNxConsoleSocketPath, consoleLogger } from '@nx-console/shared-utils';
import { Socket } from 'net';
import { platform } from 'os';
import * as rpc from 'vscode-jsonrpc/node';

// Define typed request and notification types
const focusProjectRequest = new rpc.RequestType<{ projectName: string }, void, void>(IDE_RPC_METHODS.FOCUS_PROJECT);
const focusTaskRequest = new rpc.RequestType<{ projectName: string; taskName: string }, void, void>(IDE_RPC_METHODS.FOCUS_TASK);
const showFullProjectGraphRequest = new rpc.RequestType0<void, void>(IDE_RPC_METHODS.SHOW_FULL_PROJECT_GRAPH);
const openGenerateUiRequest = new rpc.RequestType<
  { generatorName: string; options: Record<string, unknown>; cwd?: string },
  OpenGenerateUiResponse,
  void
>(IDE_RPC_METHODS.OPEN_GENERATE_UI);

/**
 * JSON-RPC client for communicating with the IDE using vscode-jsonrpc
 */
export class IdeJsonRpcClient implements IIdeJsonRpcClient {
  private socket: Socket | null = null;
  private connection: rpc.MessageConnection | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private disconnectionHandler?: (client: IdeJsonRpcClient) => void;

  constructor(private config: IdeClientConfig) {}

  /**
   * Set a handler to be called when the client disconnects
   */
  onDisconnection(handler: (client: IdeJsonRpcClient) => void): void {
    this.disconnectionHandler = handler;
  }

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

      // Wait for socket to connect
      await new Promise<void>((resolve, reject) => {
        this.socket!.on('connect', () => {
          this.status = 'connected';
          this.reconnectAttempts = 0;
          consoleLogger.log(`Connected to IDE at ${socketPath}`);
          resolve();
        });

        this.socket!.on('error', (error) => {
          consoleLogger.log('Socket connection error:', error);
          reject(error);
        });

        // Connect to socket
        if (platform() === 'win32') {
          // On Windows, connect to named pipe
          this.socket!.connect(socketPath);
        } else {
          // On Unix, connect to socket file
          this.socket!.connect(socketPath);
        }
      });

      // Create vscode-jsonrpc message connection
      const reader = new rpc.SocketMessageReader(this.socket);
      const writer = new rpc.SocketMessageWriter(this.socket);
      this.connection = rpc.createMessageConnection(reader, writer);

      // Set up connection event handlers
      this.connection.onClose(() => {
        consoleLogger.log('JSON-RPC connection closed');
        this.handleDisconnection();
      });

      this.connection.onError((error) => {
        consoleLogger.log('JSON-RPC connection error:', error);
        this.handleDisconnection();
      });

      // Start listening for messages
      this.connection.listen();

    } catch (error) {
      consoleLogger.log('Failed to connect to IDE:', error);
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

    if (this.connection) {
      this.connection.dispose();
      this.connection = null;
    }

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    this.status = 'disconnected';
  }


  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }


  /**
   * Handle disconnection and attempt reconnection
   */
  private handleDisconnection(): void {
    if (this.status === 'disconnected') {
      return; // Already handling disconnection
    }

    this.status = 'error';

    if (this.connection) {
      this.connection.dispose();
      this.connection = null;
    }

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    // Attempt reconnection if configured
    const maxAttempts = this.config.maxReconnectAttempts || 5;
    const interval = this.config.reconnectInterval || 2000;

    if (this.reconnectAttempts < maxAttempts) {
      this.reconnectAttempts++;
      consoleLogger.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${maxAttempts})...`,
      );

      this.reconnectTimer = setTimeout(() => {
        this.connect().catch((error) => {
          consoleLogger.log('Reconnection failed:', error);
          if (this.reconnectAttempts >= maxAttempts) {
            this.status = 'disconnected';
            consoleLogger.log('Max reconnection attempts reached. Giving up.');
          }
        });
      }, interval);
    } else {
      this.status = 'disconnected';
      consoleLogger.log('Max reconnection attempts reached. Connection lost.');
      
      // Notify handler of permanent disconnection
      if (this.disconnectionHandler) {
        this.disconnectionHandler(this);
      }
    }
  }

  /**
   * Focus on a specific project in the IDE
   */
  async focusProject(projectName: string): Promise<void> {
    if (!this.connection || this.status !== 'connected') {
      throw new Error('Not connected to IDE');
    }
    
    await this.connection.sendRequest(focusProjectRequest, { projectName });
  }

  /**
   * Focus on a specific task in the IDE
   */
  async focusTask(projectName: string, taskName: string): Promise<void> {
    if (!this.connection || this.status !== 'connected') {
      throw new Error('Not connected to IDE');
    }
    
    await this.connection.sendRequest(focusTaskRequest, { projectName, taskName });
  }

  /**
   * Show the full project graph in the IDE
   */
  async showFullProjectGraph(): Promise<void> {
    if (!this.connection || this.status !== 'connected') {
      throw new Error('Not connected to IDE');
    }
    
    await this.connection.sendRequest(showFullProjectGraphRequest);
  }

  /**
   * Open the generator UI in the IDE
   */
  async openGenerateUi(
    generatorName: string,
    options: Record<string, unknown>,
    cwd?: string,
  ): Promise<string> {
    if (!this.connection || this.status !== 'connected') {
      throw new Error('Not connected to IDE');
    }
    
    const response = await this.connection.sendRequest(openGenerateUiRequest, { 
      generatorName, 
      options, 
      cwd 
    });
    return response.logFileName;
  }

  /**
   * Send a notification to the IDE (fire-and-forget)
   */
  async sendNotification(method: string, params?: unknown): Promise<void> {
    if (!this.connection || this.status !== 'connected') {
      throw new Error('Not connected to IDE');
    }

    const notificationType = new rpc.NotificationType<unknown>(method);
    this.connection.sendNotification(notificationType, params);
  }
}
