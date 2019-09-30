import {
  ExtensionContext,
  TreeView,
  ViewColumn,
  WebviewPanel,
  window,
  Uri
} from 'vscode';

import { ProjectDef } from './ng-task/ng-task-definition';
import { WorkspaceTreeItem } from './workspace-tree/workspace-tree-item';
import { readFileSync } from 'fs';
import { join } from 'path';
import { TaskExecutionSchema } from '@angular-console/vscode-ui/feature-task-execution-form';
import { getTaskExecutionSchema } from './workspace-tree/get-task-execution-schema';

let webviewPanel: WebviewPanel | undefined;
let indexHtml: string | undefined;

interface RevealWebViewPanelConfig {
  context: ExtensionContext;
  workspaceTreeItem: WorkspaceTreeItem;
  getProjectEntries(): [string, ProjectDef][];
  workspaceTreeView: TreeView<WorkspaceTreeItem>;
  serverAddress: string;
}

export async function revealWebViewPanel({
  context,
  getProjectEntries,
  workspaceTreeItem,
  workspaceTreeView,
  serverAddress
}: RevealWebViewPanelConfig) {
  const { workspacePath, projectName, label } = workspaceTreeItem;

  const schema = await getTaskExecutionSchema(
    workspacePath,
    getProjectEntries,
    label,
    projectName
  );

  if (!schema) {
    return;
  }

  const webViewPanel = createWebViewPanel(context, schema, serverAddress);
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
  serverAddress: string
) {
  if (webviewPanel) {
    webviewPanel.title = schema.name;
    webviewPanel.reveal();
  } else {
    webviewPanel = window.createWebviewPanel(
      'angular-console', // Identifies the type of the webview. Used internally
      schema.name, // Title of the panel displayed to the user
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
  }

  webviewPanel.webview.html = getIframeHtml(context, schema, serverAddress);

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
    ).toString();
  }

  return indexHtml
    .replace(
      'window.VSCODE_UI_SCHEMA = {};',
      `window.VSCODE_UI_SCHEMA = ${JSON.stringify(schema)};`
    )
    .replace('<base href="/" />', `<base href="${serverAddress}" />`);
}
