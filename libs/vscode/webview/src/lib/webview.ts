import { readFileSync } from 'fs';
import { join } from 'path';
import {
  ExtensionContext,
  TreeView,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
} from 'vscode';

import { CliTaskProvider } from '@nx-console/vscode/tasks';
import {
  WorkspaceTreeItem,
} from '@nx-console/vscode/nx-workspace-tree';
import { getTelemetry } from '@nx-console/server';
import { TaskExecutionSchema, TaskExecutionMessage } from '@nx-console/schema';
import { getTaskExecutionSchema } from './get-task-execution-schema';

let webviewPanel: WebviewPanel | undefined;
let indexHtml: string | undefined;

interface RevealWebViewPanelConfig {
  context: ExtensionContext;
  workspaceTreeItem: WorkspaceTreeItem;
  cliTaskProvider: CliTaskProvider;
  workspaceTreeView: TreeView<WorkspaceTreeItem>;
  contextMenuUri?: Uri;
}

export async function revealWebViewPanel({
  context,
  cliTaskProvider,
  workspaceTreeItem,
  workspaceTreeView,
  contextMenuUri,
}: RevealWebViewPanelConfig) {
  const { label } = workspaceTreeItem;
  const schema = await getTaskExecutionSchema(
    cliTaskProvider,
    label,
    contextMenuUri
  );

  if (!schema) {
    return;
  }

  const webViewPanel = createWebViewPanel(
    context,
    schema,
    label,
    cliTaskProvider
  );
  context.subscriptions.push(webViewPanel);

  webViewPanel.onDidChangeViewState((e) => {
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
  cliTaskProvider: CliTaskProvider
) {
  if (webviewPanel) {
    webviewPanel.title = title;
    webviewPanel.webview.postMessage({ taskExecutionSchema: schema });
    webviewPanel.reveal();
  } else {
    webviewPanel = window.createWebviewPanel(
      'nx-console', // Identifies the type of the webview. Used internally
      title, // Title of the panel displayed to the user
      ViewColumn.Active, // Editor column to show the new webview panel in.
      {
        retainContextWhenHidden: true,
        enableScripts: true,
      }
    );
    webviewPanel.onDidDispose(() => {
      webviewPanel = undefined;
    });
    webviewPanel.iconPath = {
      light: Uri.file(
        join(context.extensionPath, 'assets', 'nx-console-light.svg')
      ),
      dark: Uri.file(
        join(context.extensionPath, 'assets', 'nx-console-dark.svg')
      ),
    };

    webviewPanel.webview.html = getIframeHtml(context, schema);

    webviewPanel.webview.onDidReceiveMessage((message: TaskExecutionMessage) =>
      cliTaskProvider.executeTask(message)
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
