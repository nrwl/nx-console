import { getNxGraphServer } from '@nx-console/vscode-graph-base';
import { getNxlsClient } from '@nx-console/vscode-lsp-client';
import { getOutputChannel } from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { commands, ExtensionContext } from 'vscode';

const REFRESH_WORKSPACE = 'nxConsole.refreshWorkspace';

let isRefreshing = false;

export function registerRefreshWorkspace(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(REFRESH_WORKSPACE, async (silent = false) => {
      if (isRefreshing) {
        return;
      }

      isRefreshing = true;

      if (!silent) {
        getTelemetry().logUsage('misc.refresh-workspace');
      }
      try {
        await getNxlsClient().refreshWorkspace(silent);
        await getNxGraphServer(context).restart();
      } catch (e) {
        getOutputChannel().appendLine(
          `Error refreshing workspace: ${e.message}`,
        );
      }

      isRefreshing = false;
    }),
  );
}
