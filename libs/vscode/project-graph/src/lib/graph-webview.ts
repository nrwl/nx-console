import { ProjectConfiguration } from '@nrwl/devkit';
import { ViewColumn, WebviewPanel, window } from 'vscode';
import { MessageType } from './graph-message-type';
import { loadHtml } from './load-html';

let panel: WebviewPanel | undefined;
export async function webview() {
  if (panel) {
    panel.reveal();
  } else {
    panel = window.createWebviewPanel(
      'graph',
      'Nx Graph',
      { viewColumn: ViewColumn.Active, preserveFocus: false },
      { enableScripts: true, retainContextWhenHidden: true }
    );

    panel.onDidDispose(() => {
      panel = undefined;
    });

    panel.webview.html = await loadHtml(panel);
  }
}

export function projectInWebview(
  projectName: string | undefined,
  type: MessageType
) {
  if (!panel) {
    return;
  }

  if (!projectName) {
    return;
  }

  panel.webview.postMessage({
    type,
    projectName,
  });
}
