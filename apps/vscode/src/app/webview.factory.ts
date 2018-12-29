import { ViewColumn, window, ExtensionContext, Uri, Terminal } from 'vscode';
import { join } from 'path';

export function createWebViewPanel(
  context: ExtensionContext,
  iframeUrl: string
) {
  const panel = window.createWebviewPanel(
    'angular-console', // Identifies the type of the webview. Used internally
    'Angular Console', // Title of the panel displayed to the user
    ViewColumn.Active, // Editor column to show the new webview panel in.
    {
      retainContextWhenHidden: true,
      enableScripts: true
    }
  );

  panel.iconPath = Uri.file(
    join(context.extensionPath, 'assets', 'extension_icon.png')
  );
  panel.webview.html = getIframeHtml(iframeUrl);

  let terminalToRestore: Terminal | undefined = window.activeTerminal;
  if (terminalToRestore) terminalToRestore.hide();
  panel.onDidChangeViewState(e => {
    if (e.webviewPanel.active) {
      terminalToRestore = window.activeTerminal;
      if (window.activeTerminal) window.activeTerminal.hide();
    } else {
      if (
        terminalToRestore &&
        (!window.activeTerminal ||
          window.activeTerminal.processId === terminalToRestore.processId)
      ) {
        terminalToRestore.show();
      }
      terminalToRestore = undefined;
    }
  });

  return panel;
}

function getIframeHtml(iframeUrl: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Angular Console</title>
        <base href="/" />
        <link rel="icon" type="image/x-icon" href="assets/favicon.ico" />

        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          html,
          body {
            margin: 0;
            padding: 0;
            overflow: hidden;
          }

          iframe {
            height: 100vh;
            width: 100vw;
            position: absolute;
            top: 0;
            bottom: 0;
            left: 0;
            right: 0;
          }
        </style>
      </head>
      <body>
        <iframe
          src="${iframeUrl}"
          frameborder="0"
        ></iframe>
      </body>
    </html>
  `;
}
