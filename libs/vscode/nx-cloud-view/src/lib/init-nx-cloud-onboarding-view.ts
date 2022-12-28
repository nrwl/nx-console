import { getNxCloudRunnerOptions } from '@nx-console/vscode/nx-workspace';
import { commands, ExtensionContext, window } from 'vscode';
import { NxCloudAuthenticationProvider } from './auth/nx-cloud-authentication-provider';
import { prodConfig, stagingConfig } from './config';
import { REFRESH_COMMAND } from './nx-cloud-service/commands';
import { NxCloudService } from './nx-cloud-service/nx-cloud-service';
import { NxCloudWebviewProvider } from './nx-cloud-webview-provider';

export async function initNxCloudOnboardingView(
  context: ExtensionContext,
  production: boolean
) {
  const mode = await determineProdOrDevMode(production);

  const nxCloudService = new NxCloudService(
    mode === 'dev' ? stagingConfig : prodConfig
  );
  const nxCloudWebviewProvider = new NxCloudWebviewProvider(
    context.extensionUri,
    context,
    nxCloudService
  );

  const nxCloudAuthenticationProvider = new NxCloudAuthenticationProvider(
    context,
    mode === 'dev' ? stagingConfig.authConfig : prodConfig.authConfig
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

/**
 * Determines which endpoint to use for API calls and auth
 * it's set to staging in dev mode and prod in production mode by default
 * if there's a URL set in the cloud runner, we will use that (as long as it matches either the staging or prod endpoint)
 *  */
async function determineProdOrDevMode(
  productionEnv: boolean
): Promise<'prod' | 'dev'> {
  const nxCloudRunnerOptions = await getNxCloudRunnerOptions();

  // if we're using the cloud runner but no URL is defined, it means an implicit prod endpoint
  const nxCloudRunnerUrl = nxCloudRunnerOptions
    ? nxCloudRunnerOptions.url ?? prodConfig.appUrl
    : '';

  if (nxCloudRunnerUrl === stagingConfig.appUrl) {
    return 'dev';
  }
  if (nxCloudRunnerUrl === prodConfig.appUrl) {
    return 'prod';
  }
  return productionEnv ? 'prod' : 'dev';
}
