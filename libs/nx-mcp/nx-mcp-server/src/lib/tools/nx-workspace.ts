import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getNxJsonPrompt,
  getProjectGraphErrorsPrompt,
  getProjectGraphPrompt,
  NX_WORKSPACE,
} from '@nx-console/shared-llm-context';
import { checkIsNxWorkspace } from '@nx-console/shared-npm';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { Logger } from '@nx-console/shared-utils';
import { NxWorkspaceInfoProvider } from '../nx-mcp-server';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { NxWorkspace } from '@nx-console/shared-types';

// Simple state tracking
let isRegistered = false;

/**
 * Register Nx workspace tool for workspace information
 */
export function registerNxWorkspaceTool(
  workspacePath: string,
  server: McpServer,
  logger: Logger,
  nxWorkspaceInfoProvider: NxWorkspaceInfoProvider,
  telemetry?: NxConsoleTelemetryLogger,
): void {
  if (isRegistered) {
    logger.log('Nx workspace tool already registered, skipping');
    return;
  }
  server.tool(
    NX_WORKSPACE,
    'Returns a readable representation of the nx project graph and the nx.json that configures nx. If there are project graph errors, it also returns them. Use it to answer questions about the nx workspace and architecture',
    {
      destructiveHint: false,
      readOnlyHint: true,
      openWorldHint: false,
    },
    async () => {
      telemetry?.logUsage('ai.tool-call', {
        tool: NX_WORKSPACE,
      });
      try {
        if (!workspacePath) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Error: Workspace path not set' }],
          };
        }
        if (!(await checkIsNxWorkspace(workspacePath))) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: 'Error: The provided root is not a valid nx workspace.',
              },
            ],
          };
        }

        const workspace = await nxWorkspaceInfoProvider.nxWorkspace(
          workspacePath,
          logger,
        );
        if (!workspace) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Error: Workspace not found' }],
          };
        }
        const results = getTokenLimitedToolResult(workspace);
        const content: CallToolResult['content'] = results
          .filter((result) => !!result)
          .map((result) => ({
            type: 'text',
            text: result,
          }));

        return {
          content,
        };
      } catch (e) {
        return {
          content: [{ type: 'text', text: String(e) }],
        };
      }
    },
  );

  isRegistered = true;
  logger.log('Registered Nx workspace tool');
}

export function getTokenLimitedToolResult(
  workspace: NxWorkspace,
  maxTokens = 25000,
): string[] {
  const nxJsonResult = getNxJsonPrompt(workspace.nxJson);
  let projectGraphResult = getProjectGraphPrompt(workspace.projectGraph);
  const errorsResult = workspace.errors
    ? getProjectGraphErrorsPrompt(workspace.errors, !!workspace.isPartial)
    : '';

  const getEstimatedTokenCount = () => {
    return (
      (nxJsonResult.length + projectGraphResult.length + errorsResult.length) /
      3
    );
  };

  let optimizationCounter = 0;
  while (getEstimatedTokenCount() >= maxTokens && optimizationCounter <= 2) {
    switch (optimizationCounter) {
      case 0:
        projectGraphResult = getProjectGraphPrompt(workspace.projectGraph, {
          skipOwners: true,
          skipTechnologies: true,
        });
        break;
      case 1:
        projectGraphResult = getProjectGraphPrompt(workspace.projectGraph, {
          skipOwners: true,
          skipTechnologies: true,
          truncateTargets: true,
        });
        break;
      case 2:
        projectGraphResult = getProjectGraphPrompt(workspace.projectGraph, {
          skipOwners: true,
          skipTechnologies: true,
          skipTags: true,
          truncateTargets: true,
        });
        break;
      default:
        break;
    }
    optimizationCounter++;
  }

  return [nxJsonResult, projectGraphResult, errorsResult];
}

/**
 * Check if Nx workspace tool is currently registered
 */
export function isNxWorkspaceToolRegistered(): boolean {
  return isRegistered;
}

/**
 * Reset registration state (for testing or server restart)
 */
export function resetNxWorkspaceToolState(): void {
  isRegistered = false;
}
