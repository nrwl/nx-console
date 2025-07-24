import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { Logger } from '@nx-console/shared-utils';
import { getMcpLogger } from './mcp-logger';

import { NxGeneratorsRequestOptions } from '@nx-console/language-server-types';
import { GeneratorCollectionInfo } from '@nx-console/shared-schema';
import { IIdeJsonRpcClient, NxWorkspace } from '@nx-console/shared-types';
import { McpIdeMessageSender } from './mcp-message-sender';
import {
  isNxCloudToolsRegistered,
  registerNxCloudTools,
} from './tools/nx-cloud';
import { registerNxCoreTools } from './tools/nx-core';
import { isNxIdeToolsRegistered, registerNxIdeTools } from './tools/nx-ide';
import { isNxTaskToolsRegistered, registerNxTaskTools } from './tools/nx-tasks';
import {
  isNxWorkspaceToolRegistered,
  registerNxWorkspaceTool,
} from './tools/nx-workspace';

export interface NxWorkspaceInfoProvider {
  nxWorkspace: (
    workspacePath: string,
    logger: Logger,
    reset?: boolean,
  ) => Promise<NxWorkspace | undefined>;
  getGenerators: (
    workspacePath: string,
    options?: NxGeneratorsRequestOptions,
    logger?: Logger,
  ) => Promise<GeneratorCollectionInfo[] | undefined>;
  getGitDiffs: (
    workspacePath: string,
    baseSha?: string,
    headSha?: string,
  ) => Promise<{ path: string; diffContent: string }[] | null>;
  isNxCloudEnabled: () => Promise<boolean>;
}

export class NxMcpServerWrapper {
  private server: McpServer;
  private logger: Logger;
  private _nxWorkspacePath?: string;
  private ideClient?: IIdeJsonRpcClient;
  private ideAvailable = false;
  private messageSender: McpIdeMessageSender;
  private periodicMonitoringTimer?: NodeJS.Timeout;
  private periodicMonitoringCount = 0;
  private readonly PERIODIC_MONITORING_INTERVAL = 10000; // 10 seconds
  private readonly PERIODIC_MONITORING_MAX_COUNT = 5;

  constructor(
    initialWorkspacePath: string | undefined,
    private nxWorkspaceInfoProvider: NxWorkspaceInfoProvider,
    private telemetry?: NxConsoleTelemetryLogger,
    logger?: Logger,
    ideClient?: IIdeJsonRpcClient,
    ideAvailable?: boolean,
  ) {
    this._nxWorkspacePath = initialWorkspacePath;
    this.ideClient = ideClient;
    this.ideAvailable = ideAvailable ?? false;
    this.messageSender = new McpIdeMessageSender(ideClient, this.ideAvailable);

    this.server = new McpServer(
      {
        name: 'Nx MCP',
        version: '0.0.1',
      },
      {
        capabilities: {
          tools: {
            listChanged: true,
          },
        },
      },
    );

    this.server.server.registerCapabilities({
      logging: {},
      tools: {
        listChanged: true, // Declare that we will send tool list change notifications
      },
    });

    this.logger = logger ?? getMcpLogger(this.server);

    // Log IDE connection status
    if (this.ideAvailable && this.ideClient) {
      this.logger.log('IDE client available and connected');

      // Set up disconnection handler if the client supports it
      if (
        'onDisconnection' in this.ideClient &&
        typeof this.ideClient.onDisconnection === 'function'
      ) {
        (this.ideClient as any).onDisconnection(() => {
          this.logger.log('IDE client disconnected');
          this.ideAvailable = false;
        });
      }
    } else {
      this.logger.log('Running in standalone mode (no IDE connection)');
    }
  }

  static async create(
    initialWorkspacePath: string | undefined,
    nxWorkspaceInfoProvider: NxWorkspaceInfoProvider,
    telemetry?: NxConsoleTelemetryLogger,
    logger?: Logger,
    ideClient?: IIdeJsonRpcClient,
    ideAvailable?: boolean,
  ): Promise<NxMcpServerWrapper> {
    const server = new NxMcpServerWrapper(
      initialWorkspacePath,
      nxWorkspaceInfoProvider,
      telemetry,
      logger,
      ideClient,
      ideAvailable,
    );
    logger?.log('Registering all Nx MCP tools');

    registerNxCoreTools(
      server.server,
      server.logger,
      server.nxWorkspaceInfoProvider,
      server.telemetry,
      server._nxWorkspacePath,
    );

    await server.evaluateAndAddNewTools();

    server.startPeriodicMonitoring();

    return server;
  }

  async setNxWorkspacePath(path: string) {
    this.logger.log(`Setting nx workspace path to ${path}`);
    const oldPath = this._nxWorkspacePath;
    this._nxWorkspacePath = path;

    // If workspace path changed, trigger dynamic evaluation
    if (oldPath !== path) {
      await this.evaluateAndAddNewTools();
    }
  }

  getMcpServer(): McpServer {
    return this.server;
  }

  /**
   * Check if IDE is available and connected
   */
  isIdeAvailable(): boolean {
    return this.ideAvailable && this.ideClient !== undefined;
  }

  /**
   * Get the IDE client instance (if available)
   */
  getIdeClient(): IIdeJsonRpcClient | undefined {
    return this.ideClient;
  }

  /**
   * Get the message sender instance
   */
  getMessageSender(): McpIdeMessageSender {
    return this.messageSender;
  }

  /**
   * Cleanup resources when server shuts down
   */
  cleanup(): void {
    // Stop periodic monitoring
    this.stopPeriodicMonitoring();

    if (this.ideClient) {
      try {
        this.ideClient.disconnect();
        this.logger.log('IDE client disconnected');
      } catch (error) {
        this.logger.log('Error disconnecting IDE client:', error);
      }
    }
  }

  /**
   * Check if Nx Cloud is enabled
   */
  private async isNxCloudEnabled(): Promise<boolean> {
    try {
      return await this.nxWorkspaceInfoProvider.isNxCloudEnabled();
    } catch (error) {
      this.logger.log('Error checking Nx Cloud status:', error);
      return false;
    }
  }

  /**
   * Check if we have a valid Nx workspace
   */
  private async isValidNxWorkspace(): Promise<boolean> {
    if (!this._nxWorkspacePath) {
      return false;
    }
    try {
      const workspace = await this.nxWorkspaceInfoProvider.nxWorkspace(
        this._nxWorkspacePath,
        this.logger,
      );
      return workspace !== undefined;
    } catch (error) {
      this.logger.log('Error checking workspace validity:', error);
      return false;
    }
  }

  /**
   * Check if IDE connection is available
   */
  private isIdeConnectionAvailable(): boolean {
    return this.isIdeAvailable();
  }

  /**
   * Evaluate conditions and add new tools if conditions have changed from false to true
   * This method is called periodically and on certain events to dynamically add tools
   */
  async evaluateAndAddNewTools(): Promise<void> {
    try {
      this.logger.log('Evaluating tool conditions for dynamic registration');

      // Check cloud tools condition
      const cloudEnabled = await this.isNxCloudEnabled();
      const cloudToolsRegistered = isNxCloudToolsRegistered();

      if (cloudEnabled && !cloudToolsRegistered && this._nxWorkspacePath) {
        this.logger.log('Nx Cloud tools condition met, registering tools');
        registerNxCloudTools(
          this._nxWorkspacePath,
          this.server,
          this.logger,
          this.telemetry,
          this.nxWorkspaceInfoProvider.getGitDiffs,
        );
      }

      // Check workspace tools condition
      const workspaceValid = await this.isValidNxWorkspace();

      if (
        workspaceValid &&
        !isNxWorkspaceToolRegistered() &&
        this._nxWorkspacePath
      ) {
        this.logger.log(
          'Nx workspace tools condition met, registering workspace tool',
        );
        registerNxWorkspaceTool(
          this._nxWorkspacePath,
          this.server,
          this.logger,
          this.nxWorkspaceInfoProvider,
          this.telemetry,
        );
      }

      if (
        workspaceValid &&
        !isNxTaskToolsRegistered() &&
        this._nxWorkspacePath
      ) {
        this.logger.log(
          'Nx workspace tools condition met, registering task tools',
        );
        registerNxTaskTools(
          this._nxWorkspacePath,
          this.server,
          this.logger,
          this.telemetry,
        );
      }

      // Check IDE tools condition
      const ideAvailable = this.isIdeConnectionAvailable();
      const ideToolsRegistered = isNxIdeToolsRegistered();

      if (ideAvailable && !ideToolsRegistered) {
        this.logger.log('IDE tools condition met, registering IDE tools');
        registerNxIdeTools(
          this.server,
          this.logger,
          this.telemetry,
          this.ideClient,
          this.messageSender,
        );
      }
    } catch (error) {
      this.logger.log('Error during tool condition evaluation:', error);
    }
  }

  /**
   * Start periodic condition monitoring
   * Runs 5 times with 10-second intervals after startup
   */
  startPeriodicMonitoring(): void {
    // Don't start if already running
    if (this.periodicMonitoringTimer) {
      return;
    }

    this.logger.log(
      'Starting periodic tool condition monitoring (5 times, 10-second intervals)',
    );
    this.periodicMonitoringCount = 0;

    this.periodicMonitoringTimer = setInterval(async () => {
      this.periodicMonitoringCount++;
      this.logger.log(
        `Periodic monitoring check ${this.periodicMonitoringCount}/${this.PERIODIC_MONITORING_MAX_COUNT}`,
      );

      await this.evaluateAndAddNewTools();

      // Stop after max count reached
      if (this.periodicMonitoringCount >= this.PERIODIC_MONITORING_MAX_COUNT) {
        this.stopPeriodicMonitoring();
      }
    }, this.PERIODIC_MONITORING_INTERVAL);
  }

  /**
   * Stop periodic condition monitoring
   */
  private stopPeriodicMonitoring(): void {
    if (this.periodicMonitoringTimer) {
      clearInterval(this.periodicMonitoringTimer);
      this.periodicMonitoringTimer = undefined;
      this.logger.log('Stopped periodic tool condition monitoring');
    }
  }

  /**
   * Update IDE client connection
   */
  async updateIdeConnection(
    ideClient?: IIdeJsonRpcClient,
    ideAvailable = false,
  ): Promise<void> {
    const wasAvailable = this.ideAvailable;
    this.ideClient = ideClient;
    this.ideAvailable = ideAvailable;
    this.messageSender.updateIdeConnection(ideClient, ideAvailable);

    // If IDE connection status changed, trigger dynamic evaluation
    if (wasAvailable !== ideAvailable) {
      this.logger.log(
        `IDE connection status changed from ${wasAvailable} to ${ideAvailable}`,
      );
      await this.evaluateAndAddNewTools();
    }
  }
}
