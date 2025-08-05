import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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
import { NxWorkspaceInfoProvider } from '../nx-mcp-server';

let nxWorkspacePath: string | undefined = undefined;

export function setNxWorkspacePath(path: string) {
  nxWorkspacePath = path;
}

export function registerNxCoreTools(
  server: McpServer,
  logger: Logger,
  nxWorkspaceInfoProvider: NxWorkspaceInfoProvider,
  telemetry?: NxConsoleTelemetryLogger,
  _nxWorkspacePath?: string,
): void {
  nxWorkspacePath = _nxWorkspacePath;

  // NX_DOCS - always available for documentation
  server.tool(
    NX_DOCS,
    'Returns a list of documentation sections that could be relevant to the user query. IMPORTANT: ALWAYS USE THIS IF YOU ARE ANSWERING QUESTIONS ABOUT NX. NEVER ASSUME KNOWLEDGE ABOUT NX BECAUSE IT WILL PROBABLY BE OUTDATED. Use it to learn about nx, its configuration and options instead of assuming knowledge about it.',
    {
      userQuery: z
        .string()
        .describe(
          'The user query to get docs for. You can pass the original user query verbatim or summarize it.',
        ),
    },
    {
      destructiveHint: false,
      readOnlyHint: true,
      openWorldHint: true,
    },
    async ({ userQuery }: { userQuery: string }) => {
      telemetry?.logUsage('ai.tool-call', {
        tool: NX_DOCS,
      });
      const docsPages = await getDocsContext(userQuery);
      return {
        content: [{ type: 'text', text: getDocsPrompt(docsPages) }],
      };
    },
  );

  // NX_AVAILABLE_PLUGINS - always available
  server.tool(
    NX_AVAILABLE_PLUGINS,
    'Returns a list of available Nx plugins from the core team as well as local workspace Nx plugins.',
    {
      destructiveHint: false,
      readOnlyHint: true,
      openWorldHint: true,
    },
    async () => {
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
  );

  logger.log('Registered Nx core tools');
}
