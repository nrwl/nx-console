import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '@nx-console/shared-utils';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { getRecentCIPEData } from '@nx-console/shared-nx-cloud';
import { CIPEInfo } from '@nx-console/shared-types';

// Store registered CIPE IDs to avoid re-registering
const registeredCipeIds = new Set<string>();

export async function registerNxCloudCipeResources(
  workspacePath: string,
  server: McpServer,
  logger: Logger,
  telemetry: NxConsoleTelemetryLogger | undefined,
): Promise<void> {
  try {
    // Fetch recent CIPEs
    const cipeData = await getRecentCIPEData(workspacePath, logger);
    
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
      const cipeId = cipe.ciPipelineExecutionId;
      
      // Skip if already registered
      if (registeredCipeIds.has(cipeId)) {
        continue;
      }

      const resourceName = `CIPE: ${cipe.branch} - ${cipe.status}`;
      const resourceUri = `nx-cloud://cipes/${cipeId}`;
      
      server.resource(
        resourceName,
        resourceUri,
        {
          name: resourceName,
          description: `CI Pipeline Execution on ${cipe.branch} (${cipe.status}) - ${cipe.commitTitle || 'No commit title'}`,
          mimeType: 'application/json',
        },
        async (): Promise<ReadResourceResult> => {
          telemetry?.logUsage('mcp.resource-read', {
            resource: 'nx-cloud-cipe',
            cipeId,
          });

          // Re-fetch to get the latest data
          const latestData = await getRecentCIPEData(workspacePath, logger);
          
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

          return {
            contents: [
              {
                type: 'text',
                text: JSON.stringify(latestCipe, null, 2),
              },
            ],
          };
        },
      );

      registeredCipeIds.add(cipeId);
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
): Promise<void> {
  await registerNxCloudCipeResources(workspacePath, server, logger, telemetry);
}