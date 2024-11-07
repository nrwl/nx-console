import { getNxGraphServer } from '@nx-console/vscode/graph-base';
import { getNxlsClient } from '@nx-console/vscode/lsp-client';
import { getTelemetry } from '@nx-console/vscode/telemetry';
import { commands, ExtensionContext } from 'vscode';

const REFRESH_WORKSPACE = 'nxConsole.refreshWorkspace';

let isRefreshing = false;

export function registerRefreshWorkspace(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(REFRESH_WORKSPACE, async () => {
      if (isRefreshing) {
        return;
      }

      isRefreshing = true;

      getTelemetry().logUsage('misc.refresh-workspace');

      await getNxlsClient().refreshWorkspace();
      await getNxGraphServer(context).restart();

      isRefreshing = false;
    })
  );
}
