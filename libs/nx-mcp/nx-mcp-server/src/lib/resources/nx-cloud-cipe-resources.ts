import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '@nx-console/shared-utils';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { NxWorkspaceInfoProvider } from '../nx-mcp-server';
import { NX_CLOUD_CIPE_FAILURE } from '@nx-console/shared-llm-context';
import { CIPEInfo, CIPERun } from '@nx-console/shared-types';
import { renderCipeDetails } from '../tools/nx-cloud';

// Type for registered resource objects (they have a remove() method)
type RegisteredResource = {
  remove: () => void;
};

// Store registered resources by CIPE ID for management
// The value is the registered resource object returned by server.resource()
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
    const resourcesToRemove: string[] = [];
    for (const [cipeId, resource] of registeredResources.entries()) {
      if (!latestCipeIds.has(cipeId)) {
        resourcesToRemove.push(cipeId);
        try {
          // Call .remove() on the resource object to remove it from the MCP client's list
          resource.remove();
        } catch (error) {
          logger.log(`Error removing CIPE resource ${cipeId}:`, error);
        }
      }
    }

    // Clean up our tracking map
    for (const cipeId of resourcesToRemove) {
      registeredResources.delete(cipeId);
    }

    if (resourcesToRemove.length > 0) {
      logger.log(`Removed ${resourcesToRemove.length} stale CIPE resources`);
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
      if (registeredResources.has(cipeId)) {
        continue;
      }

      // Create pretty name with branch and commit info
      const resourceName = cipe.branch;
      const statusText =
        cipe.status === 'SUCCEEDED'
          ? 'Succeeded'
          : cipe.status === 'FAILED'
            ? 'Failed'
            : cipe.status === 'IN_PROGRESS'
              ? 'In Progress'
              : cipe.status;

      // Use CIPE ID in URL for stability
      const resourceUri = `nx-cloud://cipes/${cipeId}`;

      // Register the resource and store the returned object (which has .remove(), .enable(), .disable() methods)
      const registeredResource = server.resource(
        resourceName,
        resourceUri,
        {
          name: `${resourceName}  [${statusText}]`,
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
                  type: 'text',
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

          // Find the specific CIPE with latest data
          const latestCipe = latestData.info?.find(
            (c) => c.ciPipelineExecutionId === cipeId,
          );

          if (!latestCipe) {
            return {
              contents: [
                {
                  type: 'text',
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

          const description = `This is a CI Pipeline Execution (CIPE) from Nx Cloud. To retrieve terminal output for failed tasks, use the ${NX_CLOUD_CIPE_FAILURE} tool with the executionId or linkId and the taskId from the list of failed tasks.`;

          return {
            contents: [
              {
                type: 'text',
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
