import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '@nx-console/shared-utils';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { NxWorkspaceInfoProvider } from '../nx-mcp-server';

// Store registered CIPE resource URIs to avoid re-registering
const registeredCipeUris = new Set<string>();

export async function registerNxCloudCipeResources(
  workspacePath: string,
  server: McpServer,
  logger: Logger,
  telemetry: NxConsoleTelemetryLogger | undefined,
  nxWorkspaceInfoProvider: NxWorkspaceInfoProvider,
): Promise<void> {
  try {
    // Check if provider supports CIPE data
    if (!nxWorkspaceInfoProvider.getRecentCIPEData) {
      logger.log('Provider does not support getRecentCIPEData');
      return;
    }

    // Fetch recent CIPEs through the provider
    const cipeData = await nxWorkspaceInfoProvider.getRecentCIPEData(workspacePath, logger);
    
    if (cipeData.error) {
      logger.log(`Error getting recent CIPE data: ${cipeData.error.message}`);
      return;
    }

    if (!cipeData.info || cipeData.info.length === 0) {
      logger.log('No recent CIPEs found to register as resources');
      return;
    }

    // Register each CIPE as an individual resource
    for (const cipe of cipeData.info) {
      // Create a human-readable identifier using branch and commit info
      const identifier = `${cipe.branch}/${cipe.commitTitle || cipe.ciPipelineExecutionId}`;
      const resourceUri = `nx-cloud://cipes/${encodeURIComponent(identifier)}`;
      
      // Skip if already registered
      if (registeredCipeUris.has(resourceUri)) {
        continue;
      }

      const resourceName = `${cipe.branch} - ${cipe.commitTitle || 'No commit title'}`;
      const statusEmoji = cipe.status === 'SUCCEEDED' ? '✅' : 
                          cipe.status === 'FAILED' ? '❌' : 
                          cipe.status === 'IN_PROGRESS' ? '🔄' : '⏸️';
      
      server.resource(
        resourceName,
        resourceUri,
        {
          name: `${statusEmoji} ${resourceName}`,
          description: `CI Pipeline Execution on ${cipe.branch} (${cipe.status}) - ${cipe.author || 'Unknown author'}`,
          mimeType: 'application/json',
        },
        async (): Promise<ReadResourceResult> => {
          telemetry?.logUsage('mcp.resource-read', {
            resource: 'nx-cloud-cipe',
            branch: cipe.branch,
            cipeId: cipe.ciPipelineExecutionId,
          });

          // Re-fetch to get the latest data
          const latestData = await nxWorkspaceInfoProvider.getRecentCIPEData!(workspacePath, logger);
          
          if (latestData.error) {
            return {
              contents: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: latestData.error,
                  }, null, 2),
                },
              ],
            };
          }

          // Find the specific CIPE with latest data
          // Match by CIPE ID since that's the stable identifier
          const latestCipe = latestData.info?.find(c => c.ciPipelineExecutionId === cipe.ciPipelineExecutionId);
          
          if (!latestCipe) {
            return {
              contents: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: {
                      type: 'not_found',
                      message: `CIPE for ${identifier} not found in recent data`,
                    },
                  }, null, 2),
                },
              ],
            };
          }

          // Include the workspace URL for convenience
          const result = {
            ...latestCipe,
            workspaceUrl: latestData.workspaceUrl,
          };

          return {
            contents: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        },
      );

      registeredCipeUris.add(resourceUri);
    }

    logger.log(`Registered ${cipeData.info.length} Nx Cloud CIPE resources`);
  } catch (error) {
    logger.log('Error registering CIPE resources:', error);
  }
}

/**
 * Refresh CIPE resources by fetching latest data and registering new ones
 */
export async function refreshNxCloudCipeResources(
  workspacePath: string,
  server: McpServer,
  logger: Logger,
  telemetry: NxConsoleTelemetryLogger | undefined,
  nxWorkspaceInfoProvider: NxWorkspaceInfoProvider,
): Promise<void> {
  await registerNxCloudCipeResources(workspacePath, server, logger, telemetry, nxWorkspaceInfoProvider);
}