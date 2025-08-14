import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '@nx-console/shared-utils';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { NxWorkspaceInfoProvider } from '../nx-mcp-server';

// Store registered CIPE IDs to avoid re-registering
const registeredCipeIds = new Set<string>();

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

    let newResourcesCount = 0;

    // Register each CIPE as an individual resource
    for (const cipe of cipeData.info) {
      const cipeId = cipe.ciPipelineExecutionId;
      
      // Skip if already registered
      if (registeredCipeIds.has(cipeId)) {
        continue;
      }

      // Create pretty name with branch and commit info
      const resourceName = `${cipe.branch} - ${cipe.commitTitle || 'No commit title'}`;
      const statusEmoji = cipe.status === 'SUCCEEDED' ? '✅' : 
                          cipe.status === 'FAILED' ? '❌' : 
                          cipe.status === 'IN_PROGRESS' ? '🔄' : '⏸️';
      
      // Use CIPE ID in URL for stability
      const resourceUri = `nx-cloud://cipes/${cipeId}`;
      
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
          const latestCipe = latestData.info?.find(c => c.ciPipelineExecutionId === cipeId);
          
          if (!latestCipe) {
            return {
              contents: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: {
                      type: 'not_found',
                      message: `CIPE with ID ${cipeId} not found in recent data`,
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

      registeredCipeIds.add(cipeId);
      newResourcesCount++;
    }

    if (newResourcesCount > 0) {
      logger.log(`Registered ${newResourcesCount} new Nx Cloud CIPE resources (${registeredCipeIds.size} total)`);
    }
  } catch (error) {
    logger.log('Error registering CIPE resources:', error);
  }
}

/**
 * Clear all registered CIPE IDs (useful for cleanup)
 */
export function clearRegisteredCipeIds(): void {
  registeredCipeIds.clear();
}