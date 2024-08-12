import {
  NxStopDaemonRequest,
  NxWorkspaceRefreshNotification,
} from '@nx-console/language-server/types';
import { getNxGraphServer } from '@nx-console/vscode/graph-base';
import { getNxlsClient } from '@nx-console/vscode/lsp-client';
import { logAndShowError } from '@nx-console/vscode/output-channels';
import { getTelemetry } from '@nx-console/vscode/utils';
import { commands, ExtensionContext, ProgressLocation, window } from 'vscode';

const REFRESH_WORKSPACE = 'nxConsole.refreshWorkspace';

let isRefreshing = false;

export function registerRefreshWorkspace(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(REFRESH_WORKSPACE, async () => {
      if (isRefreshing) {
        return;
      }

      isRefreshing = true;

      getTelemetry().featureUsed('nx.refreshWorkspace');

      window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: 'Refreshing Workspace',
          cancellable: false,
        },
        async (progress) => {
          try {
            const nxlsClient = getNxlsClient();
            progress.report({ message: 'Stopping nx daemon', increment: 10 });
            try {
              await nxlsClient?.sendRequest(NxStopDaemonRequest, undefined);
            } catch (e) {
              // errors while stopping the daemon aren't critical
            }
            progress.report({ increment: 30 });

            progress.report({ message: 'Restarting language server' });
            await Promise.all([
              nxlsClient?.restart(),
              getNxGraphServer(context).restart(),
            ]);
            progress.report({ message: 'Refreshing workspace', increment: 30 });

            nxlsClient?.sendNotification(NxWorkspaceRefreshNotification);

            await new Promise<void>((resolve) => {
              if (!nxlsClient) {
                resolve();
                return;
              }
              const disposable = nxlsClient.subscribeToRefresh(() => {
                disposable.dispose();
                resolve();
              });
            });
          } catch (error) {
            logAndShowError(
              "Couldn't refresh workspace. Please view the logs for more information.",
              error
            );
          } finally {
            isRefreshing = false;
          }
        }
      );
    })
  );
}
