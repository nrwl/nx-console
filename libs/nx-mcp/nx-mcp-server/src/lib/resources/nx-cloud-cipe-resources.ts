import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '@nx-console/shared-utils';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';

export function registerNxCloudCipeResources(
  workspacePath: string,
  server: McpServer,
  logger: Logger,
  telemetry: NxConsoleTelemetryLogger | undefined,
  getRecentCIPEData: (
    workspacePath: string,
    logger: Logger,
  ) => Promise<{
    info?: any[];
    error?: any;
    workspaceUrl?: string;
  }>,
): void {
  // Register CIPE list resource
  server.resource(
    'nx-cloud-recent-cipes',
    'nx-cloud://cipes/recent',
    {
      name: 'Recent CI Pipeline Executions',
      description: 'List of recent CI Pipeline Executions from Nx Cloud',
      mimeType: 'application/json',
    },
    async (): Promise<ReadResourceResult> => {
      telemetry?.logUsage('mcp.resource-read', {
        resource: 'nx-cloud-recent-cipes',
      });

      try {
        const cipeData = await getRecentCIPEData(workspacePath, logger);
        
        if (cipeData.error) {
          logger.log(`Error getting recent CIPE data: ${cipeData.error.message}`);
          return {
            contents: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: cipeData.error,
                }, null, 2),
              },
            ],
          };
        }

        const responseData = {
          workspaceUrl: cipeData.workspaceUrl,
          cipes: cipeData.info || [],
        };

        return {
          contents: [
            {
              type: 'text',
              text: JSON.stringify(responseData, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.log('Error in CIPE resource handler:', error);
        return {
          contents: [
            {
              type: 'text',
              text: JSON.stringify({
                error: {
                  type: 'internal',
                  message: error instanceof Error ? error.message : 'Unknown error',
                },
              }, null, 2),
            },
          ],
        };
      }
    },
  );

  // Register individual CIPE resources using template
  server.resource(
    'nx-cloud-cipe',
    {
      pattern: 'nx-cloud://cipes/{cipeId}',
      variables: {
        cipeId: {
          description: 'The CI Pipeline Execution ID',
        },
      },
    },
    {
      name: 'CI Pipeline Execution Details',
      description: 'Details of a specific CI Pipeline Execution',
      mimeType: 'application/json',
    },
    async ({ cipeId }): Promise<ReadResourceResult> => {
      telemetry?.logUsage('mcp.resource-read', {
        resource: 'nx-cloud-cipe',
        cipeId,
      });

      try {
        // First get all recent CIPEs
        const cipeData = await getRecentCIPEData(workspacePath, logger);
        
        if (cipeData.error) {
          return {
            contents: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: cipeData.error,
                }, null, 2),
              },
            ],
          };
        }

        // Find the specific CIPE
        const cipe = cipeData.info?.find(c => c.ciPipelineExecutionId === cipeId);
        
        if (!cipe) {
          return {
            contents: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: {
                    type: 'not_found',
                    message: `CIPE with ID ${cipeId} not found`,
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
              text: JSON.stringify(cipe, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.log('Error in CIPE resource handler:', error);
        return {
          contents: [
            {
              type: 'text',
              text: JSON.stringify({
                error: {
                  type: 'internal',
                  message: error instanceof Error ? error.message : 'Unknown error',
                },
              }, null, 2),
            },
          ],
        };
      }
    },
  );

  logger.log('Registered Nx Cloud CIPE resources');
}