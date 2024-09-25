import { actions, createMachine, setup } from 'xstate';
import { ProjectDetailsPreview } from './project-details-preview';
import { ViewColumn, WebviewPanel, window } from 'vscode';

export class NewProjectDetailsPreview implements ProjectDetailsPreview {
  private webviewPanel: WebviewPanel = window.createWebviewPanel(
    'nx-console-project-details',
    `Project Details`,
    ViewColumn.Beside,
    {
      enableScripts: true,
    }
  );

  projectRoot: string | undefined;

  constructor(private path: string) {
    const machine = setup({
      actions: {
        renderLoading: () => this.renderLoading(),
      },
    }).createMachine({
      id: 'projectDetails',
      initial: 'loading',
      states: {
        loading: {},
        showingPDV: {},
        showingPDVMulti: {},
        showingError: {},
        showingNoGraphError: {},
      },
    });
  }

  private renderLoading() {
    this.webviewPanel.webview.html = `<html><body>Loading...</body></html>`;
  }

  onDispose(callback: () => void): void {
    this.webviewPanel.onDidDispose(callback);
  }

  reveal(column?: ViewColumn): void {
    this.webviewPanel.reveal(column);
  }
}
