import {
  TaskExecutionSchema,
  TaskExecutionMessage
} from '@angular-console/vscode-ui/feature-task-execution-form';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  ExtensionContext,
  TreeView,
  Uri,
  ViewColumn,
  WebviewPanel,
  window
} from 'vscode';

import { NgTaskProvider } from './ng-task/ng-task-provider';
import { getTaskExecutionSchema } from './workspace-tree/get-task-execution-schema';
import { WorkspaceTreeItem } from './workspace-tree/workspace-tree-item';

let webviewPanel: WebviewPanel | undefined;
let indexHtml: string | undefined;

interface RevealWebViewPanelConfig {
  context: ExtensionContext;
  workspaceTreeItem: WorkspaceTreeItem;
  ngTaskProvider: NgTaskProvider;
  workspaceTreeView: TreeView<WorkspaceTreeItem>;
  serverAddress: string;
}

export async function revealWebViewPanel({
  context,
  ngTaskProvider,
  workspaceTreeItem,
  workspaceTreeView,
  serverAddress
}: RevealWebViewPanelConfig) {
  const { workspacePath, label } = workspaceTreeItem;

  const schema = await getTaskExecutionSchema(
    workspacePath,
    () => ngTaskProvider.getProjectEntries(),
    label
  );

  if (!schema) {
    return;
  }

  const webViewPanel = createWebViewPanel(
    context,
    schema,
    serverAddress,
    label,
    ngTaskProvider
  );
  context.subscriptions.push(webViewPanel);

  webViewPanel.onDidChangeViewState(e => {
    if (e.webviewPanel.visible) {
      workspaceTreeItem.revealWorkspaceRoute(workspaceTreeView);
    }
  });

  return webViewPanel;
}

export function createWebViewPanel(
  context: ExtensionContext,
  schema: TaskExecutionSchema,
  serverAddress: string,
  title: string,
  ngTaskProvider: NgTaskProvider
) {
  if (webviewPanel) {
    webviewPanel.title = title;
    webviewPanel.webview.postMessage({ taskExecutionSchema: schema });
    webviewPanel.reveal();
  } else {
    webviewPanel = window.createWebviewPanel(
      'angular-console', // Identifies the type of the webview. Used internally
      title, // Title of the panel displayed to the user
      ViewColumn.Active, // Editor column to show the new webview panel in.
      {
        retainContextWhenHidden: true,
        enableScripts: true
      }
    );
    webviewPanel.onDidDispose(() => {
      webviewPanel = undefined;
    });
    webviewPanel.iconPath = Uri.file(
      join(context.extensionPath, 'assets', 'angular-console.png')
    );

    webviewPanel.webview.html = getIframeHtml(context, schema, serverAddress);

    webviewPanel.webview.onDidReceiveMessage(
      (message: TaskExecutionMessage) => {
        ngTaskProvider.executeTask(message);
      }
    );
  }

  return webviewPanel;
}

export function getIframeHtml(
  context: ExtensionContext,
  schema: TaskExecutionSchema,
  serverAddress: string
) {
  if (!indexHtml) {
    // Cache html and inline all styles and scripts.
    indexHtml = readFileSync(
      join(context.extensionPath, 'assets/public/index.html')
    )
      .toString()
      .replace(
        '<link rel="stylesheet" href="styles.css">',
        `<style>${readFileSync(
          join(context.extensionPath, 'assets/public/styles.css')
        )}</style>`
      )
      .replace(
        '<script src="runtime.js"></script>',
        `<script>${readFileSync(
          join(context.extensionPath, 'assets/public/runtime.js')
        )}</script>`
      )
      .replace(
        '<script src="main.js"></script>',
        `<script>${readFileSync(
          join(context.extensionPath, 'assets/public/main.js')
        )}</script>`
      );
  }

  return indexHtml
    .replace(
      'window.VSCODE_UI_SCHEMA = {};',
      `window.VSCODE_UI_SCHEMA = ${JSON.stringify(schema)};`
    )
    .replace('<base href="/" />', `<base href="${serverAddress}" />`);
}
