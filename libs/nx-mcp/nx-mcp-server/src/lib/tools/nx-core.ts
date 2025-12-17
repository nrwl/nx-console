import { NxVersion } from '@nx-console/nx-version';
import {
  getDocsContext,
  getDocsPrompt,
  getPluginsInformation,
  NX_AVAILABLE_PLUGINS,
  NX_DOCS,
} from '@nx-console/shared-llm-context';
import { NxConsoleTelemetryLogger } from '@nx-console/shared-telemetry';
import { NxWorkspace } from '@nx-console/shared-types';
import { Logger } from '@nx-console/shared-utils';
import { z } from 'zod';
import { NxWorkspaceInfoProvider } from '../nx-mcp-server-wrapper';
import { isToolEnabled } from '../tool-filter';
import { ToolRegistry } from '../tool-registry';

let nxWorkspacePath: string | undefined = undefined;

export function setNxWorkspacePath(path: string) {
  nxWorkspacePath = path;
}

export function registerNxCoreTools(
  registry: ToolRegistry,
  logger: Logger,
  nxWorkspaceInfoProvider: NxWorkspaceInfoProvider,
  telemetry?: NxConsoleTelemetryLogger,
  _nxWorkspacePath?: string,
  toolsFilter?: string[],
): void {
  nxWorkspacePath = _nxWorkspacePath;

  if (!isToolEnabled(NX_DOCS, toolsFilter)) {
    logger.debug?.(`Skipping ${NX_DOCS} - disabled by tools filter`);
  } else {
    registry.registerTool({
      name: NX_DOCS,
      description:
        'Returns a list of documentation sections that could be relevant to the user query. IMPORTANT: ALWAYS USE THIS IF YOU ARE ANSWERING QUESTIONS ABOUT NX. NEVER ASSUME KNOWLEDGE ABOUT NX BECAUSE IT WILL PROBABLY BE OUTDATED. Use it to learn about nx, its configuration and options instead of assuming knowledge about it.',
      inputSchema: {
        userQuery: z
          .string()
          .describe(
            'The user query to get docs for. You can pass the original user query verbatim or summarize it.',
          ),
      },
      annotations: {
        destructiveHint: false,
        readOnlyHint: true,
        openWorldHint: true,
      },
      handler: async (args) => {
        const { userQuery } = args as { userQuery: string };
        telemetry?.logUsage('ai.tool-call', {
          tool: NX_DOCS,
        });
        const docsPages = await getDocsContext(userQuery);
        return {
          content: [{ type: 'text', text: getDocsPrompt(docsPages) }],
        };
      },
    });
  }

  if (!isToolEnabled(NX_AVAILABLE_PLUGINS, toolsFilter)) {
    logger.debug?.(
      `Skipping ${NX_AVAILABLE_PLUGINS} - disabled by tools filter`,
    );
  } else {
    registry.registerTool({
      name: NX_AVAILABLE_PLUGINS,
      description:
        'Returns a list of available Nx plugins from the core team as well as local workspace Nx plugins.',
      annotations: {
        destructiveHint: false,
        readOnlyHint: true,
        openWorldHint: true,
      },
      handler: async () => {
        telemetry?.logUsage('ai.tool-call', {
          tool: NX_AVAILABLE_PLUGINS,
        });

        let nxVersion: NxVersion | undefined = undefined;
        let nxWorkspace: NxWorkspace | undefined = undefined;
        const workspacePath: string | undefined = nxWorkspacePath;

        if (nxWorkspacePath) {
          nxWorkspace = await nxWorkspaceInfoProvider.nxWorkspace(
            nxWorkspacePath,
            logger,
          );
          nxVersion = nxWorkspace?.nxVersion;
        }

        const pluginsInfo = await getPluginsInformation(
          nxVersion,
          workspacePath,
          nxWorkspace,
          logger,
        );

        return {
          content: [
            {
              type: 'text',
              text: pluginsInfo.formattedText,
            },
          ],
        };
      },
    });
  }

  logger.debug?.('Registered Nx core tools');
}
