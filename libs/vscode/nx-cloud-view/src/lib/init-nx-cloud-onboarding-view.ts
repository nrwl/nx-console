import { commands, ExtensionContext, window } from 'vscode';
import { NxCloudAuthenticationProvider } from './auth/nx-cloud-authentication-provider';
import { REFRESH_COMMAND } from './nx-cloud-service/commands';
import { NxCloudService } from './nx-cloud-service/nx-cloud-service';
import { NxCloudWebviewProvider } from './nx-cloud-webview-provider';

export function initNxCloudOnboardingView(
  context: ExtensionContext,
  production: boolean
) {
  const config = production ? 'prod' : 'dev';
  const nxCloudService = new NxCloudService(config);
  const nxCloudWebviewProvider = new NxCloudWebviewProvider(
    context.extensionUri,
    context,
    nxCloudService
  );

  const nxCloudAuthenticationProvider = new NxCloudAuthenticationProvider(
    context,
    config
  );

  context.subscriptions.push(
    window.registerWebviewViewProvider('nxCloud', nxCloudWebviewProvider),
    nxCloudAuthenticationProvider,
    commands.registerCommand('nxConsole.refreshCloudWebview', () => {
      nxCloudService.handleMessage({ command: REFRESH_COMMAND });
      nxCloudAuthenticationProvider.refresh();
    })
  );
}
