import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { Logger } from '@nx-console/shared-utils';
import { getMcpLogger } from './mcp-logger';

import { NxGeneratorsRequestOptions } from '@nx-console/language-server-types';
import { GeneratorCollectionInfo } from '@nx-console/shared-schema';
import { NxWorkspace } from '@nx-console/shared-types';
import { IdeProvider } from './ide-provider';
import { registerNxCloudTools } from './tools/nx-cloud';
import {
  registerNxCoreTools,
  setNxWorkspacePath as setNxWorkspacePathForCoreTools,
} from './tools/nx-core';
import { registerNxIdeTools } from './tools/nx-ide';
import { registerNxTaskTools } from './tools/nx-tasks';
import {
  registerNxWorkspaceTools,
  setNxWorkspacePath as setNxWorkspacePathForWorkspaceTools,
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
  private logger: Logger;
  private _nxWorkspacePath?: string;
  private ideProvider?: IdeProvider;
  private periodicMonitoringTimer?: NodeJS.Timeout;
  private periodicMonitoringCount = 0;
  private readonly PERIODIC_MONITORING_INTERVAL = 10000; // 10 seconds
  private readonly PERIODIC_MONITORING_MAX_COUNT = 5;
  private ideConnectionCleanup?: () => void;

  constructor(
    initialWorkspacePath: string | undefined,
    private nxWorkspaceInfoProvider: NxWorkspaceInfoProvider,
    private server: McpServer,
    ideProvider?: IdeProvider,
    private telemetry?: NxConsoleTelemetryLogger,
    logger?: Logger,
  ) {
    this._nxWorkspacePath = initialWorkspacePath;
    this.ideProvider = ideProvider;

    this.server.server.registerCapabilities({
      logging: {},
      tools: {
        listChanged: true,
      },
    });

    this.logger = logger ?? getMcpLogger(this.server);

    if (this.ideProvider?.isAvailable()) {
      this.logger.log('IDE provider available and connected');
    } else {
      this.logger.log('Running in standalone mode (no IDE connection)');
    }

    // Set up IDE connection change listener if provider exists
    if (this.ideProvider) {
      this.ideConnectionCleanup = this.ideProvider.onConnectionChange(
        async (available) => {
          this.logger.log(`IDE connection status changed to: ${available}`);
          await this.evaluateAndAddNewTools();
        },
      );
    }
  }

  static async create(
    initialWorkspacePath: string | undefined,
    nxWorkspaceInfoProvider: NxWorkspaceInfoProvider,
    mcpServer: McpServer,
    ideProvider?: IdeProvider,
    telemetry?: NxConsoleTelemetryLogger,
    logger?: Logger,
  ): Promise<NxMcpServerWrapper> {
    const server = new NxMcpServerWrapper(
      initialWorkspacePath,
      nxWorkspaceInfoProvider,
      mcpServer,
      ideProvider,
      telemetry,
      logger,
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
      setNxWorkspacePathForCoreTools(path);
      setNxWorkspacePathForWorkspaceTools(path);
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
    return this.ideProvider?.isAvailable() ?? false;
  }

  /**
   * Cleanup resources when server shuts down
   */
  cleanup(): void {
    // Stop periodic monitoring
    this.stopPeriodicMonitoring();

    // Clean up IDE connection listener
    if (this.ideConnectionCleanup) {
      this.ideConnectionCleanup();
    }

    // Dispose IDE provider if it exists
    this.ideProvider?.dispose();
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
    return this.ideProvider?.isAvailable() ?? false;
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

      if (cloudEnabled && this._nxWorkspacePath) {
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

      if (workspaceValid && this._nxWorkspacePath) {
        registerNxWorkspaceTools(
          this._nxWorkspacePath,
          this.server,
          this.logger,
          this.nxWorkspaceInfoProvider,
          this.telemetry,
        );
      }

      if (workspaceValid && this._nxWorkspacePath) {
        registerNxTaskTools(this.server, this.logger, this.telemetry);
      }

      // Check IDE tools condition
      const ideAvailable = this.isIdeConnectionAvailable();

      if (ideAvailable && this.ideProvider) {
        this.logger.log('IDE tools condition met, registering IDE tools');
        registerNxIdeTools(
          this.server,
          this.logger,
          this.ideProvider,
          this.telemetry,
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
}
