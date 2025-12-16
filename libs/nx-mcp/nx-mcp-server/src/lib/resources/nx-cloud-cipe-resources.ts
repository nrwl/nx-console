import {
  McpServer,
  RegisteredResource,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { Logger } from '@nx-console/shared-utils';
import { NxWorkspaceInfoProvider } from '../nx-mcp-server-wrapper';
import { renderCipeDetails } from '../tools/nx-cloud';

const registeredResources = new Map<string, RegisteredResource>();

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
    const cipeData = await nxWorkspaceInfoProvider.getRecentCIPEData(
      workspacePath,
      logger,
    );

    if (cipeData.error) {
      logger.log(`Error getting recent CIPE data: ${cipeData.error.message}`);
      return;
    }

    const latestCipeIds = new Set<string>();

    if (cipeData.info && cipeData.info.length > 0) {
      // Track which CIPEs are in the latest data
      for (const cipe of cipeData.info) {
        latestCipeIds.add(cipe.ciPipelineExecutionId);
      }
    }

    // Remove resources for CIPEs that no longer exist
    for (const [cipeId, resource] of registeredResources.entries()) {
      if (!latestCipeIds.has(cipeId)) {
        registeredResources.delete(cipeId);

        try {
          // Call .remove() on the resource object to remove it from the MCP client's list
          resource.remove();
        } catch (error) {
          logger.log(`Error removing CIPE resource ${cipeId}:`, error);
        }
      }
    }

    if (!cipeData.info || cipeData.info.length === 0) {
      return;
    }

    let newResourcesCount = 0;

    // Register each CIPE as an individual resource
    for (const cipe of cipeData.info) {
      const cipeId = cipe.ciPipelineExecutionId;

      if (registeredResources.has(cipeId)) {
        continue;
      }

      const resourceName = cipe.branch;
      const statusText =
        cipe.status === 'SUCCEEDED'
          ? 'Succeeded'
          : cipe.status === 'FAILED'
            ? 'Failed'
            : cipe.status === 'IN_PROGRESS'
              ? 'In Progress'
              : cipe.status;

      const resourceUri = `nx-cloud://cipes/${cipeId}`;

      // Register the resource and store the returned object
      const registeredResource = server.registerResource(
        resourceName,
        resourceUri,
        {
          description: `${cipe.commitTitle || 'Unknown commit'} by ${cipe.author || 'Unknown author'}`,
          mimeType: 'application/json',
        },
        async (): Promise<ReadResourceResult> => {
          telemetry?.logUsage('ai.resource-read', {
            resource: 'nx-cloud-cipe',
          });

          // Re-fetch to get the latest data
          // We already checked that getRecentCIPEData exists at the start of the function
          const latestData = await nxWorkspaceInfoProvider.getRecentCIPEData!(
            workspacePath,
            logger,
          );

          if (!latestData || latestData.error) {
            return {
              contents: [
                {
                  mimeType: 'text/plain',
                  text: JSON.stringify(
                    {
                      error: latestData.error,
                    },
                    null,
                    2,
                  ),
                  uri: resourceUri,
                },
              ],
            };
          }

          const latestCipe = latestData.info?.find(
            (c) => c.ciPipelineExecutionId === cipeId,
          );

          if (!latestCipe) {
            return {
              contents: [
                {
                  mimeType: 'text/plain',
                  text: JSON.stringify(
                    {
                      error: {
                        type: 'not_found',
                        message: `CIPE with ID ${cipeId} not found in recent data`,
                      },
                    },
                    null,
                    2,
                  ),
                  uri: resourceUri,
                },
              ],
            };
          }

          const description = `This is a CI Pipeline Execution (CIPE) from Nx Cloud.`;

          return {
            contents: [
              {
                mimeType: 'text/plain',
                text: `${description}\n\n${renderCipeDetails(latestCipe)}`,
                uri: resourceUri,
              },
            ],
          };
        },
      );

      // Store the resource object so we can call .remove() on it later
      registeredResources.set(cipeId, registeredResource);
      newResourcesCount++;
    }

    if (newResourcesCount > 0) {
      logger.log(
        `Registered ${newResourcesCount} new Nx Cloud CIPE resources (${registeredResources.size} total)`,
      );
    }
  } catch (error) {
    logger.log('Error registering CIPE resources:', error);
  }
}

/**
 * Clear all registered CIPE resources (useful for cleanup)
 */
export function clearRegisteredCipeResources(): void {
  // Remove all registered resources by calling .remove() on each resource object
  for (const resource of registeredResources.values()) {
    try {
      // This removes the resource from the MCP client's resource list
      resource.remove();
    } catch (error) {
      // Resource might already be removed, ignore errors
    }
  }
  // Clear our tracking map
  registeredResources.clear();
}
