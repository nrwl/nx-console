import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';
import { getNxCloudStatus } from '@nx-console/vscode/nx-workspace';
import { getNxlsOutputChannel } from '@nx-console/vscode/output-channels';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { getTelemetry } from '@nx-console/vscode/telemetry';
import { commands, ExtensionContext, window } from 'vscode';

export function initNxCloudView(context: ExtensionContext) {
  const setContext = async () => {
    const nxCloudStatus = await getNxCloudStatus();
    commands.executeCommand(
      'setContext',
      'nxConsole.connectedToCloud',
      nxCloudStatus?.isConnected ?? false
    );
  };
  setContext();
  onWorkspaceRefreshed(() => setContext());

  context.subscriptions.push(
    commands.registerCommand('nx.connectToCloud', async () => {
      getTelemetry().featureUsed('nx.connectToCloud');
      CliTaskProvider.instance.executeTask({
        command: 'connect',
        flags: [],
      });
    }),
    commands.registerCommand('nxConsole.openCloudApp', async () => {
      const cloudUrl = (await getNxCloudStatus())?.nxCloudUrl;

      if (cloudUrl) {
        getTelemetry().featureUsed('nx.openCloudApp');
        const cloudUrlWithTracking = `${cloudUrl}?utm_campaign=open-cloud-app&utm_medium=cloud-promo&utm_source=nxconsole`;
        commands.executeCommand('vscode.open', cloudUrlWithTracking);
      } else {
        window
          .showErrorMessage(
            'Something went wrong while retrieving the Nx Cloud URL.',
            'Open Logs',
            'OK'
          )
          .then((selection) => {
            if (selection === 'Open Logs') {
              getNxlsOutputChannel().show();
            }
          });
      }
    })
  );
}
