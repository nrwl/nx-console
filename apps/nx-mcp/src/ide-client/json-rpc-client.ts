import { RunningTasksMap } from '@nx-console/shared-running-tasks';
import {
  ConnectionStatus,
  IDE_RPC_METHODS,
  OpenGenerateUiResponse,
  IIdeJsonRpcClient,
  FocusProjectRequest,
  FocusTaskRequest,
  ShowFullProjectGraphRequest,
  OpenGenerateUiRequest,
  GetRunningTasksResponse,
} from '@nx-console/shared-types';
import { Logger } from '@nx-console/shared-utils';
import { getNxConsoleSocketPath } from '@nx-console/shared-socket-utils';
import { Socket } from 'net';
import { platform } from 'os';
import * as rpc from 'vscode-jsonrpc/node';

// Define typed request and notification types
const focusProjectRequest = new rpc.NotificationType<FocusProjectRequest>(
  IDE_RPC_METHODS.FOCUS_PROJECT,
);
const focusTaskRequest = new rpc.NotificationType<FocusTaskRequest>(
  IDE_RPC_METHODS.FOCUS_TASK,
);
const showFullProjectGraphRequest =
  new rpc.NotificationType<ShowFullProjectGraphRequest>(
    IDE_RPC_METHODS.SHOW_FULL_PROJECT_GRAPH,
  );
const openGenerateUiRequest = new rpc.RequestType<
  OpenGenerateUiRequest,
  OpenGenerateUiResponse,
  void
>(IDE_RPC_METHODS.OPEN_GENERATE_UI);

const getRunningTasksRequest = new rpc.RequestType<
  undefined,
  GetRunningTasksResponse,
  void
>(IDE_RPC_METHODS.GET_RUNNING_TASKS);

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

  constructor(
    private workspacePath: string,
    private logger?: Logger,
    private reconnectInterval = 2000,
    private maxReconnectAttempts = 5,
  ) {}

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
      const socketPath = await getNxConsoleSocketPath(this.workspacePath);

      this.socket = new Socket();

      await new Promise<void>((resolve, reject) => {
        this.socket!.on('connect', () => {
          this.status = 'connected';
          this.reconnectAttempts = 0;
          this.logger?.log(`Connected to IDE at ${socketPath}`);
          resolve();
        });

        this.socket!.on('error', (error) => {
          this.logger?.log('Socket connection error:', error);
          reject(error);
        });

        if (platform() === 'win32') {
          // On Windows, connect to named pipe
          this.socket!.connect(socketPath);
        } else {
          // On Unix, connect to socket file
          this.socket!.connect(socketPath);
        }
      });

      const reader = new rpc.SocketMessageReader(this.socket);
      const writer = new rpc.SocketMessageWriter(this.socket);
      this.connection = rpc.createMessageConnection(reader, writer);

      this.connection.onClose(() => {
        this.logger?.log('JSON-RPC connection closed');
        this.handleDisconnection();
      });

      this.connection.onError((error) => {
        this.logger?.log('JSON-RPC connection error:', error);
        this.handleDisconnection();
      });

      this.connection.listen();
    } catch (error) {
      this.logger?.log('Failed to connect to IDE:', error);
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
    const maxAttempts = this.maxReconnectAttempts || 5;
    const interval = this.reconnectInterval || 2000;

    if (this.reconnectAttempts < maxAttempts) {
      this.reconnectAttempts++;
      this.logger?.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${maxAttempts})...`,
      );

      this.reconnectTimer = setTimeout(() => {
        this.connect().catch((error) => {
          this.logger?.log('Reconnection failed:', error);
          if (this.reconnectAttempts >= maxAttempts) {
            this.status = 'disconnected';
            this.logger?.log('Max reconnection attempts reached. Giving up.');
          }
        });
      }, interval);
    } else {
      this.status = 'disconnected';
      this.logger?.log('Max reconnection attempts reached. Connection lost.');

      // Notify handler of permanent disconnection
      if (this.disconnectionHandler) {
        this.disconnectionHandler(this);
      }
    }
  }

  async focusProject(projectName: string): Promise<void> {
    if (!this.connection || this.status !== 'connected') {
      throw new Error('Not connected to IDE');
    }

    await this.connection.sendNotification(focusProjectRequest, {
      projectName,
    });
  }

  async focusTask(projectName: string, taskName: string): Promise<void> {
    if (!this.connection || this.status !== 'connected') {
      throw new Error('Not connected to IDE');
    }

    await this.connection.sendNotification(focusTaskRequest, {
      projectName,
      taskName,
    });
  }

  async showFullProjectGraph(): Promise<void> {
    if (!this.connection || this.status !== 'connected') {
      throw new Error('Not connected to IDE');
    }

    await this.connection.sendNotification(showFullProjectGraphRequest);
  }

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
      cwd,
    });
    return response.logFileName;
  }

  async getRunningTasks(): Promise<RunningTasksMap> {
    if (!this.connection || this.status !== 'connected') {
      throw new Error('Not connected to IDE');
    }

    const response = await this.connection.sendRequest(
      getRunningTasksRequest,
      undefined,
    );
    return response.runningTasks;
  }

  async sendNotification(method: string, params?: unknown): Promise<void> {
    if (!this.connection || this.status !== 'connected') {
      throw new Error('Not connected to IDE');
    }

    const notificationType = new rpc.NotificationType<unknown>(method);
    this.connection.sendNotification(notificationType, params);
  }
}
