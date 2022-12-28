import { getNxCloudRunnerUrl } from '@nx-console/vscode/nx-workspace';
import { commands, ExtensionContext, window } from 'vscode';
import { NxCloudAuthenticationProvider } from './auth/nx-cloud-authentication-provider';
import { REFRESH_COMMAND } from './nx-cloud-service/commands';
import { NxCloudService } from './nx-cloud-service/nx-cloud-service';
import { NxCloudWebviewProvider } from './nx-cloud-webview-provider';

const authStagingConfig = {
  clientId: '11Zte67xGtfrGQhRVlz9zM8Fq0LvZYwe',
  audience: 'https://api.staging.nrwl.io/',
  domain: 'https://auth.staging.nx.app/login',
};

const authProdConfig = {
  clientId: 'm6PYBsCK1t2DTKnbE30n029C22fqtTMm',
  audience: 'https://api.nrwl.io/',
  domain: 'https://nrwl.auth0.com/login',
};

const apiStagingEndpoint = 'https://staging.nx.app/api';
const apiProdEndpoint = 'https://cloud.nx.app/api';

const stagingUrl = 'http://staging.nx.app';
const prodUrl = 'https://cloud.nx.app';

export async function initNxCloudOnboardingView(
  context: ExtensionContext,
  production: boolean
) {
  const mode = await determineProdOrDevMode(production);

  const nxCloudService = new NxCloudService(
    mode === 'dev' ? apiStagingEndpoint : apiProdEndpoint
  );
  const nxCloudWebviewProvider = new NxCloudWebviewProvider(
    context.extensionUri,
    context,
    nxCloudService
  );

  const nxCloudAuthenticationProvider = new NxCloudAuthenticationProvider(
    context,
    mode === 'dev' ? authStagingConfig : authProdConfig
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
  const nxCloudRunnerUrl = await getNxCloudRunnerUrl();

  if (nxCloudRunnerUrl === stagingUrl) {
    return 'dev';
  }
  if (nxCloudRunnerUrl === prodUrl) {
    return 'prod';
  }
  return productionEnv ? 'prod' : 'dev';
}
