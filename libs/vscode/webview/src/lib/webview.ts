import { join } from 'path';
import {
  commands,
  ExtensionContext,
  ExtensionMode,
  TreeView,
  Uri,
  ViewColumn,
  Webview,
  WebviewPanel,
  window,
} from 'vscode';

import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { RunTargetTreeItem } from '@nx-console/vscode/nx-run-target-view';
import { getTelemetry } from '@nx-console/server';
import { TaskExecutionSchema, TaskExecutionMessage } from '@nx-console/schema';
import { getTaskExecutionSchema } from './get-task-execution-schema';
import { watch } from 'fs';

let webviewPanel: WebviewPanel | undefined;

interface RevealWebViewPanelConfig {
  context: ExtensionContext;
  runTargetTreeItem: RunTargetTreeItem;
  cliTaskProvider: CliTaskProvider;
  runTargetTreeView: TreeView<RunTargetTreeItem>;
  contextMenuUri?: Uri;
}

export async function revealWebViewPanel({
  context,
  cliTaskProvider,
  runTargetTreeItem,
  runTargetTreeView,
  contextMenuUri,
}: RevealWebViewPanelConfig) {
  const { label } = runTargetTreeItem;
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
      runTargetTreeItem.revealWorkspaceRoute(runTargetTreeView);
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

    setWebViewContent(webviewPanel, context, schema);

    if (context.extensionMode === ExtensionMode.Development) {
      watch(join(context.extensionPath, 'assets', 'public', 'main.js'), () => {
        if (webviewPanel) {
          setWebViewContent(webviewPanel, context, schema);
          commands.executeCommand(
            'workbench.action.webview.reloadWebviewAction'
          );
        }
      });
    }

    webviewPanel.webview.onDidReceiveMessage((message: TaskExecutionMessage) =>
      cliTaskProvider.executeTask(message)
    );
  }

  getTelemetry().screenViewed(title);

  return webviewPanel;
}

function setWebViewContent(
  webviewPanel: WebviewPanel,
  context: ExtensionContext,
  schema: TaskExecutionSchema
) {
  webviewPanel.webview.html = getIframeHtml(
    webviewPanel.webview,
    context,
    schema
  );
}

export function getIframeHtml(
  webView: Webview,
  context: ExtensionContext,
  schema: TaskExecutionSchema
) {
  const stylePath = Uri.joinPath(
    context.extensionUri,
    'assets',
    'public',
    'styles.css'
  );
  const runtimePath = Uri.joinPath(
    context.extensionUri,
    'assets',
    'public',
    'runtime.js'
  );
  const mainPath = Uri.joinPath(
    context.extensionUri,
    'assets',
    'public',
    'main.js'
  );

  const codiconsPath = Uri.joinPath(
    context.extensionUri,
    'assets',
    'public',
    'codicon.css'
  );

  const indexHtml = `<!DOCTYPE html>
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
    <link href="${webView.asWebviewUri(stylePath)}" rel="stylesheet"/>
    <link href="${webView.asWebviewUri(codiconsPath)}" rel="stylesheet" />
  </head>
  <body>
    <vscode-ui-task-execution-form></vscode-ui-task-execution-form>
    <script src="${webView.asWebviewUri(runtimePath)}"></script>
    <script src="${webView.asWebviewUri(mainPath)}"></script>
  </body>
</html>`;

  return indexHtml.replace(
    'window.VSCODE_UI_SCHEMA = {};',
    `window.VSCODE_UI_SCHEMA = ${JSON.stringify(schema)};`
  );
}
