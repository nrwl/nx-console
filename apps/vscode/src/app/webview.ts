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
import { getTelemetry } from './telemetry';
import {
  TaskExecutionSchema,
  TaskExecutionMessage
} from '@angular-console/schema';

let webviewPanel: WebviewPanel | undefined;
let indexHtml: string | undefined;

interface RevealWebViewPanelConfig {
  context: ExtensionContext;
  workspaceTreeItem: WorkspaceTreeItem;
  ngTaskProvider: NgTaskProvider;
  workspaceTreeView: TreeView<WorkspaceTreeItem>;
}

export async function revealWebViewPanel({
  context,
  ngTaskProvider,
  workspaceTreeItem,
  workspaceTreeView
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

    webviewPanel.webview.html = getIframeHtml(context, schema);

    webviewPanel.webview.onDidReceiveMessage(
      (message: TaskExecutionMessage) => {
        ngTaskProvider.executeTask(message);
      }
    );
  }

  getTelemetry().screenViewed(title);

  return webviewPanel;
}

export function getIframeHtml(
  context: ExtensionContext,
  schema: TaskExecutionSchema
) {
  if (!indexHtml) {
    // Cache html and inline all styles and scripts.
    indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>VscodeUi</title>
    <base href="/" />

    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/x-icon" href="favicon.ico" />

    <script>
      // At runtime, VSCode server will replace this empty schema with the one to render.
      window.VSCODE_UI_SCHEMA = {};

      window.addEventListener('message', event => {
        const taskExecutionSchema = event.data.taskExecutionSchema;
        if (taskExecutionSchema && window.SET_TASK_EXECUTION_SCHEMA) {
          window.SET_TASK_EXECUTION_SCHEMA(taskExecutionSchema);
        }
      });

      window.vscode = acquireVsCodeApi();
    </script>
    <style>${readFileSync(
      join(context.extensionPath, 'assets/public/styles.css')
    )}</style>
  </head>
  <body>
    <vscode-ui-task-execution-form></vscode-ui-task-execution-form>
    <script>
      ${readFileSync(join(context.extensionPath, 'assets/public/runtime.js'))}
    </script>
    <script>
      ${readFileSync(join(context.extensionPath, 'assets/public/main.js'))}
    </script>
  </body>
</html>`;
  }

  return indexHtml.replace(
    'window.VSCODE_UI_SCHEMA = {};',
    `window.VSCODE_UI_SCHEMA = ${JSON.stringify(schema)};`
  );
}
