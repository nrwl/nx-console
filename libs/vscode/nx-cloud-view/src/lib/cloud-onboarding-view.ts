import {
  findNxPackagePath,
  getNxAccessToken,
  getNxCloudUrl,
  importWorkspaceDependency,
} from '@nx-console/shared/npm';
import { CloudOnboardingInfo } from '@nx-console/shared/types';
import { getNxWorkspacePath } from '@nx-console/vscode/configuration';
import { getNxCloudStatus } from '@nx-console/vscode/nx-workspace';

import {
  CancellationToken,
  commands,
  Disposable,
  ExtensionContext,
  tasks,
  Uri,
  WebviewView,
  WebviewViewProvider,
  WebviewViewResolveContext,
  window,
} from 'vscode';

import { withTimeout } from '@nx-console/shared/utils';
import { getNxlsOutputChannel } from '@nx-console/vscode/output-channels';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { getTelemetry } from '@nx-console/vscode/telemetry';
import { join } from 'path';
import { isDeepStrictEqual } from 'util';
import { ActorRef, EventObject } from 'xstate';
import { createNxCloudOnboardingURL } from './get-cloud-onboarding-url';

export class CloudOnboardingViewProvider implements WebviewViewProvider {
  public static viewId = 'nxCloudOnboarding';

  private _view: WebviewView | undefined;
  private _webviewSourceUri: Uri;

  private _refreshSubscription: Disposable | undefined;

  private onboardingInfo: CloudOnboardingInfo | undefined;

  constructor(
    private extensionContext: ExtensionContext,
    private actor: ActorRef<any, EventObject>
  ) {
    this._webviewSourceUri = Uri.joinPath(
      this.extensionContext.extensionUri,
      'nx-cloud-onboarding-webview'
    );

    this.ensureStateSubscription();
  }

  async resolveWebviewView(
    webviewView: WebviewView,
    context: WebviewViewResolveContext,
    token: CancellationToken
  ): Promise<void> {
    this.ensureStateSubscription();

    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._webviewSourceUri],
    };

    webviewView.webview.html = this.getWebviewContent(
      webviewView,
      this.onboardingInfo
    );

    webviewView.webview.onDidReceiveMessage((event) => {
      this.handleWebviewMessage(event);
    });

    webviewView.onDidDispose(() => {
      if (this._refreshSubscription) {
        this._refreshSubscription.dispose();
      }
    });
  }

  async refresh() {
    if (this._view) {
      this._view.webview.html = this.getWebviewContent(
        this._view,
        this.onboardingInfo
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
        getTelemetry().logUsage('cloud.show-affected-docs');
        commands.executeCommand(
          'vscode.open',
          Uri.parse('https://nx.dev/ci/features/affected?utm_source=nxconsole')
        );
        break;
      }
      case 'open-cloud-app': {
        commands.executeCommand('nxCloud.openApp');
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

    const codiconsUri = webviewView.webview.asWebviewUri(
      Uri.joinPath(
        this._webviewSourceUri,
        '@vscode',
        'codicons',
        'dist',
        'codicon.css'
      )
    );

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${codiconsUri}" rel="stylesheet">

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

  private ensureStateSubscription() {
    if (this._refreshSubscription) {
      return;
    }

    this.onboardingInfo = this.actor.getSnapshot().context.onboardingInfo;
    const sub = this.actor.subscribe((state) => {
      const newState = state.context.onboardingInfo as
        | CloudOnboardingInfo
        | undefined;

      if (newState && !isDeepStrictEqual(this.onboardingInfo, newState)) {
        this.onboardingInfo = newState;
        this.refresh();
      }
    });
    this._refreshSubscription = new Disposable(() => {
      sub.unsubscribe();
      this._refreshSubscription = undefined;
    });
    this.extensionContext.subscriptions.push(this._refreshSubscription);
  }

  static create(
    extensionContext: ExtensionContext,
    actor: ActorRef<any, EventObject>
  ) {
    const onboardingProvider = new CloudOnboardingViewProvider(
      extensionContext,
      actor
    );
    extensionContext.subscriptions.push(
      window.registerWebviewViewProvider(
        CloudOnboardingViewProvider.viewId,
        onboardingProvider
      )
    );
  }
}

async function finishCloudSetup() {
  getTelemetry().logUsage('cloud.finish-setup');
  const workspacePath = getNxWorkspacePath();

  const accessToken = await getNxAccessToken(workspacePath);

  const nxCloudUrl = await getNxCloudUrl(workspacePath);

  if (nxCloudUrl) {
    process.env['NX_CLOUD_API'] = nxCloudUrl;
  }

  let url: string | undefined;

  await withTimeout(async () => {
    const importPath = await findNxPackagePath(
      workspacePath,
      join('src', 'nx-cloud', 'utilities', 'url-shorten.js')
    );

    const nxPackage = importPath
      ? await importWorkspaceDependency<any>(importPath)
      : undefined;

    // for newer versions of nx, we can simply load the logic from the local installations
    if (nxPackage && nxPackage.createNxCloudOnboardingURL) {
      url = await nxPackage.createNxCloudOnboardingURL(
        'nx-console',
        accessToken
      );
    } else {
      url = await createNxCloudOnboardingURL(accessToken);
    }
  }, 5000);

  if (nxCloudUrl) {
    delete process.env['NX_CLOUD_API'];
  }

  if (url) {
    commands.executeCommand('vscode.open', Uri.parse(url));
  } else {
    window.showErrorMessage('Failed to shorten Nx Cloud URL');
  }
}

function generateCI() {
  getTelemetry().logUsage('cloud.generate-ci-workflow');

  CliTaskProvider.instance.executeTask({
    command: 'generate',
    positional: '@nx/workspace:ci-workflow',
    flags: [],
  });
}
