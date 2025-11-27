import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { Logger } from '@nx-console/shared-utils';
import { getMcpLogger } from './mcp-logger';

import {
  ServerCapabilities,
  SetLevelRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { NxGeneratorsRequestOptions } from '@nx-console/language-server-types';
import { GeneratorCollectionInfo } from '@nx-console/shared-schema';
import { NxWorkspace, CIPEInfo, CIPEInfoError } from '@nx-console/shared-types';
import { IdeProvider } from './ide-provider';
import { registerNxCloudTools } from './tools/nx-cloud';
import {
  registerNxCloudCipeResources,
  clearRegisteredCipeResources,
} from './resources/nx-cloud-cipe-resources';
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
  getRecentCIPEData?: (
    workspacePath: string,
    logger: Logger,
  ) => Promise<{
    info?: CIPEInfo[];
    error?: CIPEInfoError;
    workspaceUrl?: string;
  }>;
}

export class NxMcpServerWrapper {
  private logger: Logger;
  private _nxWorkspacePath?: string;
  private periodicMonitoringTimer?: NodeJS.Timeout;
  private periodicMonitoringCount = 0;
  private readonly PERIODIC_MONITORING_INTERVAL = 10000; // 10 seconds
  private readonly PERIODIC_MONITORING_MAX_COUNT = 5;
  private ideConnectionCleanup?: () => void;
  private cipeRefreshInterval?: NodeJS.Timeout;
  private readonly CIPE_REFRESH_INTERVAL = 30000; // 30 seconds
  private toolRegistrationState = {
    nxWorkspace: false,
    nxCore: false,
    nxCloud: false,
    nxIde: false,
    nxTasks: false,
  };

  constructor(
    initialWorkspacePath: string | undefined,
    private nxWorkspaceInfoProvider: NxWorkspaceInfoProvider,
    private server: McpServer,
    private ideProvider?: IdeProvider,
    private telemetry?: NxConsoleTelemetryLogger,
    logger?: Logger,
    private toolsFilter?: string[],
  ) {
    this._nxWorkspacePath = initialWorkspacePath;
    this.ideProvider = ideProvider;

    this.server.server.registerCapabilities({
      logging: {},
      tools: {
        listChanged: true,
      },
      resources: {
        list: true,
        subscribe: false,
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
    toolsFilter?: string[],
  ): Promise<NxMcpServerWrapper> {
    const server = new NxMcpServerWrapper(
      initialWorkspacePath,
      nxWorkspaceInfoProvider,
      mcpServer,
      ideProvider,
      telemetry,
      logger,
      toolsFilter,
    );
    logger?.debug?.('Registering all Nx MCP tools');

    server.server.server.setRequestHandler(
      SetLevelRequestSchema,
      (req, res) => {
        return {};
      },
    );

    registerNxCoreTools(
      server.server,
      server.logger,
      server.nxWorkspaceInfoProvider,
      server.telemetry,
      server._nxWorkspacePath,
      server.toolsFilter,
    );
    server.toolRegistrationState.nxCore = true;

    await server.evaluateAndAddNewTools();

    server.startPeriodicMonitoring();

    return server;
  }

  async setNxWorkspacePath(path: string) {
    this.logger.log(
      `Setting mcp nx workspace path from ${this._nxWorkspacePath} to ${path}`,
    );

    // If workspace path changed, trigger dynamic evaluation
    if (this._nxWorkspacePath !== path) {
      this._nxWorkspacePath = path;
      this.logger.log(
        `Nx workspace path changed, re-evaluating tools for new path: ${path}`,
      );
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

    // Stop CIPE refresh interval
    this.stopCipeRefreshInterval();

    // Clean up IDE connection listener
    if (this.ideConnectionCleanup) {
      this.ideConnectionCleanup();
    }

    // Dispose IDE provider if it exists
    this.ideProvider?.dispose();

    // Clear all registered CIPE resources
    clearRegisteredCipeResources();
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
      // Check cloud tools condition
      const cloudEnabled = await this.isNxCloudEnabled();

      if (
        cloudEnabled &&
        this._nxWorkspacePath &&
        !this.toolRegistrationState.nxCloud
      ) {
        registerNxCloudTools(
          this._nxWorkspacePath,
          this.server,
          this.logger,
          this.telemetry,
          this.toolsFilter,
        );

        // Register CIPE resources
        await registerNxCloudCipeResources(
          this._nxWorkspacePath,
          this.server,
          this.logger,
          this.telemetry,
          this.nxWorkspaceInfoProvider,
        );

        // Start refresh interval for CIPE resources
        // Disabled while we figure out a better way to handle multiple NxMcpServerWrapper
        // this.startCipeRefreshInterval();

        this.toolRegistrationState.nxCloud = true;
      }

      // Check workspace tools condition
      const workspaceValid = await this.isValidNxWorkspace();

      if (
        workspaceValid &&
        this._nxWorkspacePath &&
        !this.toolRegistrationState.nxWorkspace
      ) {
        registerNxWorkspaceTools(
          this._nxWorkspacePath,
          this.server,
          this.logger,
          this.nxWorkspaceInfoProvider,
          this.telemetry,
          this.toolsFilter,
        );
        this.toolRegistrationState.nxWorkspace = true;
      }

      // Check IDE tools condition
      const ideAvailable = this.isIdeConnectionAvailable();

      if (
        workspaceValid &&
        ideAvailable &&
        this.ideProvider?.isAvailable() &&
        this._nxWorkspacePath &&
        !this.toolRegistrationState.nxTasks
      ) {
        registerNxTaskTools(
          this.server,
          this.ideProvider,
          this.logger,
          this.telemetry,
          this.toolsFilter,
        );
        this.toolRegistrationState.nxTasks = true;
      }

      if (
        ideAvailable &&
        this.ideProvider &&
        this._nxWorkspacePath &&
        !this.toolRegistrationState.nxIde &&
        this.ideProvider.isAvailable()
      ) {
        registerNxIdeTools(
          this.server,
          this.logger,
          this.ideProvider,
          this.telemetry,
          this.toolsFilter,
        );
        this.toolRegistrationState.nxIde = true;
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

    this.logger.debug?.(
      'Starting periodic tool condition monitoring (5 times, 10-second intervals)',
    );
    this.periodicMonitoringCount = 0;

    this.periodicMonitoringTimer = setInterval(async () => {
      this.periodicMonitoringCount++;

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
      this.logger.debug?.('Stopped periodic tool condition monitoring');
    }
  }

  /**
   * Start CIPE refresh interval
   * Refreshes available CIPE resources every 30 seconds
   */
  private startCipeRefreshInterval(): void {
    // Don't start if already running
    if (this.cipeRefreshInterval) {
      return;
    }

    // Don't start if workspace path or provider is not available
    if (
      !this._nxWorkspacePath ||
      !this.nxWorkspaceInfoProvider.getRecentCIPEData
    ) {
      return;
    }

    this.logger.log('Starting CIPE refresh interval (every 30 seconds)');

    this.cipeRefreshInterval = setInterval(async () => {
      try {
        await registerNxCloudCipeResources(
          this._nxWorkspacePath!,
          this.server,
          this.logger,
          this.telemetry,
          this.nxWorkspaceInfoProvider,
        );
      } catch (error) {
        this.logger.log('Error refreshing CIPE resources:', error);
      }
    }, this.CIPE_REFRESH_INTERVAL);
  }

  /**
   * Stop CIPE refresh interval
   */
  private stopCipeRefreshInterval(): void {
    if (this.cipeRefreshInterval) {
      clearInterval(this.cipeRefreshInterval);
      this.cipeRefreshInterval = undefined;
      this.logger.log('Stopped CIPE refresh interval');
    }
  }
}

export const nxMcpServerCapabilities: ServerCapabilities = {
  tools: {
    listChanged: true,
  },
  resources: {
    list: true,
    subscribe: false,
  },
  logging: {},
};
