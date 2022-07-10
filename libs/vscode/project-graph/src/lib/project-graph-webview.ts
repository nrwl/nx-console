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
      'project-graph',
      'Nx Project Graph',
      { viewColumn: ViewColumn.Active, preserveFocus: false },
      { enableScripts: true }
    );
  }

  panel.webview.html = await loadHtml(panel);
}

export function focusProjectInWebview(project: ProjectConfiguration | null) {
  if (!panel) {
    return;
  }

  if (!project) {
    return;
  }

  panel.webview.postMessage({
    type: MessageType.focus,
    projectName: project.name,
  });
}
