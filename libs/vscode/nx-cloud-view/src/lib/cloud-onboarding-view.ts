import {
  findNxPackagePath,
  getNxAccessToken,
  getNxCloudUrl,
  importWorkspaceDependency,
} from '@nx-console/shared/npm';
import { CloudOnboardingInfo } from '@nx-console/shared/types';
import {
  getNxWorkspacePath,
  WorkspaceConfigurationStore,
} from '@nx-console/vscode/configuration';
import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';
import { getCloudOnboardingInfo } from '@nx-console/vscode/nx-workspace';
import { config as loadDotEnvFile } from 'dotenv';
import { expand } from 'dotenv-expand';
import { join } from 'path';

import {
  CancellationToken,
  commands,
  ExtensionContext,
  tasks,
  Uri,
  WebviewView,
  WebviewViewProvider,
  WebviewViewResolveContext,
  window,
} from 'vscode';

import { withTimeout } from '@nx-console/shared/utils';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { getTelemetry } from '@nx-console/vscode/utils';
import * as UrlShorten from 'nx/src/nx-cloud/utilities/url-shorten';
import { createNxCloudOnboardingURL } from './get-cloud-onboarding-url';

export class CloudOnboardingViewProvider implements WebviewViewProvider {
  public static viewId = 'nxCloudOnboarding';

  private _view: WebviewView | undefined;
  private _webviewSourceUri: Uri;

  constructor(private extensionContext: ExtensionContext) {
    this._webviewSourceUri = Uri.joinPath(
      this.extensionContext.extensionUri,
      'nx-cloud-onboarding-webview'
    );

    const sub = onWorkspaceRefreshed(async () => {
      await this.refresh();
    });
    if (sub) {
      extensionContext.subscriptions.push(sub);
    }
  }

  async resolveWebviewView(
    webviewView: WebviewView,
    context: WebviewViewResolveContext,
    token: CancellationToken
  ): Promise<void> {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._webviewSourceUri],
    };

    const cloudOnboardingInfo = await getCloudOnboardingInfo();

    webviewView.webview.html = this.getWebviewContent(
      webviewView,
      cloudOnboardingInfo
    );

    webviewView.webview.onDidReceiveMessage((event) => {
      this.handleWebviewMessage(event);
    });
  }

  async refresh() {
    if (this._view) {
      const cloudOnboardingInfo = await window.withProgress(
        {
          location: { viewId: CloudOnboardingViewProvider.viewId },
        },
        async () => {
          return await getCloudOnboardingInfo();
        }
      );

      this._view.webview.html = this.getWebviewContent(
        this._view,
        cloudOnboardingInfo
      );
    }
  }

  private handleWebviewMessage(event: any) {
    switch (event.type) {
      case 'connect-to-cloud': {
        commands.executeCommand('nx.connectToCloud');
        break;
      }
      case 'login': {
        commands.executeCommand('nxCloud.login');
        tasks.onDidEndTaskProcess((taskEndEvent) => {
          if (taskEndEvent.execution.task.name === 'nx-cloud login') {
            this.refresh();
          }
        });
        break;
      }
      case 'finish-cloud-setup': {
        finishCloudSetup();
        break;
      }
      case 'generate-ci': {
        generateCI();
        break;
      }
      case 'show-affected-docs': {
        commands.executeCommand(
          'vscode.open',
          Uri.parse('https://nx.dev/ci/features/affected?utm_source=nxconsole')
        );
        break;
      }
      case 'open-cloud-app': {
        commands.executeCommand('nxConsole.openCloudApp');
        break;
      }
      default: {
        break;
      }
    }
  }

  private getWebviewContent(
    webviewView: WebviewView,
    cloudOnboardingInfo: CloudOnboardingInfo | undefined
  ) {
    const webviewScriptUri = webviewView.webview.asWebviewUri(
      Uri.joinPath(this._webviewSourceUri, 'main.js')
    );
    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				
				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<title>Nx Cloud Onboarding</title>
                </head>
                <body>
                <script type="module" src="${webviewScriptUri}"></script>
				<root-element cloudOnboardingInfo='${JSON.stringify(
          cloudOnboardingInfo
        )}'></root-element>
			</body>
			</html>`;
  }
}

async function finishCloudSetup() {
  const workspacePath = getNxWorkspacePath();

  const accessToken = await getNxAccessToken(workspacePath);

  if (!accessToken) {
    window.showErrorMessage(
      'Unable to find nx access token. Either define accessToken in nx.json or set the NX_CLOUD_ACCESS_TOKEN env variable.'
    );
    return;
  }

  const nxCloudUrl = await getNxCloudUrl(workspacePath);

  if (nxCloudUrl) {
    process.env['NX_CLOUD_API'] = nxCloudUrl;
  }

  let url: string | undefined;

  await withTimeout(async () => {
    url = await createNxCloudOnboardingURL(accessToken);
  }, 5000);

  if (nxCloudUrl) {
    delete process.env['NX_CLOUD_API'];
  }

  if (url) {
    commands.executeCommand('vscode.open', Uri.parse(url));
  } else {
    window.showErrorMessage('Failed to shorten the url');
  }
}

function generateCI() {
  getTelemetry().featureUsed('nx.generateCI');

  CliTaskProvider.instance.executeTask({
    command: 'generate',
    positional: '@nx/workspace:ci-workflow',
    flags: [],
  });
}
