import {
  CancellationToken,
  commands,
  ExtensionContext,
  ExtensionMode,
  Uri,
  Webview,
  WebviewView,
  WebviewViewProvider,
  WebviewViewResolveContext,
} from 'vscode';
import { NxCloudService } from './nx-cloud-service/nx-cloud-service';

export class NxCloudWebviewProvider implements WebviewViewProvider {
  private _view?: WebviewView;
  private _webviewSourceUri: Uri;

  constructor(
    private readonly _extensionUri: Uri,
    private context: ExtensionContext,
    private nxCloudService: NxCloudService
  ) {
    this._webviewSourceUri = Uri.joinPath(
      this._extensionUri,
      'nx-cloud-webview'
    );
  }

  resolveWebviewView(
    webviewView: WebviewView,
    context: WebviewViewResolveContext<unknown>,
    token: CancellationToken
  ): void | Thenable<void> {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [this._webviewSourceUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // pass state to webview and receive messages back
    this.nxCloudService.webviewState$.subscribe((state) => {
      webviewView.webview.postMessage(state);
    });

    webviewView.webview.onDidReceiveMessage((message) => {
      this.nxCloudService.handleMessage(message);
    });
  }

  private _getHtmlForWebview(webview: Webview): string {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      Uri.joinPath(this._webviewSourceUri, 'main.js')
    );

    // Do the same for the stylesheets
    const styleResetUri = webview.asWebviewUri(
      Uri.joinPath(this._webviewSourceUri, 'reset.css')
    );
    const styleVSCodeUri = webview.asWebviewUri(
      Uri.joinPath(this._webviewSourceUri, 'vscode.css')
    );
    const styleMainUri = webview.asWebviewUri(
      Uri.joinPath(this._webviewSourceUri, 'main.css')
    );

    // and all other URI's used in the webview
    const uiToolkitUri = webview.asWebviewUri(
      Uri.joinPath(
        this._webviewSourceUri,
        '@vscode',
        'webview-ui-toolkit',
        'dist',
        'toolkit.js'
      )
    );
    const codiconsUri = webview.asWebviewUri(
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
        <meta charset="UTF-8">
       
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleResetUri}" rel="stylesheet">
        <link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${styleMainUri}" rel="stylesheet">
        <link href="${codiconsUri}" rel="stylesheet">
        <title>Nx Cloud Onboarding</title>

        <style>
        html {
          min-height: 100%;
        }
        body {
          height: 100vh;
        }
        root-element {
          height: 100%;
        }
        </style>
      </head>
      <body>

        <script type="module" src="${uiToolkitUri}">“</script>
        <script type="module" src="${scriptUri}">“</script>

        <script type="text/javascript">
         window.codiconsUri = "${codiconsUri}";
        </script>

        <root-element></root-element>
      </body>
    </html>`;
  }
}
