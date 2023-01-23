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
import { getTelemetry } from '@nx-console/vscode/utils';
import {
  TaskExecutionSchema,
  TaskExecutionSchemaInputMessage,
  TaskExecutionOutputMessage,
  TaskExecutionOutputMessageType,
  TaskExecutionGlobalConfigurationInputMessage,
} from '@nx-console/shared/schema';
import { getTaskExecutionSchema } from './get-task-execution-schema';
import { watch } from 'fs';
import { GlobalConfigurationStore } from '@nx-console/vscode/configuration';

let webviewPanel: WebviewPanel | undefined;

interface RevealWebViewPanelConfig {
  context: ExtensionContext;
  runTargetTreeItem: RunTargetTreeItem;
  cliTaskProvider: CliTaskProvider;
  runTargetTreeView: TreeView<RunTargetTreeItem>;
  contextMenuUri?: Uri;
  generator?: string;
}

export async function revealWebViewPanel({
  context,
  cliTaskProvider,
  runTargetTreeItem,
  runTargetTreeView,
  contextMenuUri,
  generator,
}: RevealWebViewPanelConfig) {
  const { label, generatorType } = runTargetTreeItem;
  const schema = await getTaskExecutionSchema(
    cliTaskProvider,
    label,
    contextMenuUri,
    generatorType,
    generator
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
  const webviewPanelExists = !!webviewPanel;
  if (!webviewPanel) {
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
    setWebViewContent(webviewPanel, context);

    if (context.extensionMode === ExtensionMode.Development) {
      watch(join(context.extensionPath, 'assets', 'public', 'main.js'), () => {
        if (webviewPanel) {
          setWebViewContent(webviewPanel, context);
          commands.executeCommand(
            'workbench.action.webview.reloadWebviewAction'
          );
        }
      });
    }

    webviewPanel.webview.onDidReceiveMessage(
      (message: TaskExecutionOutputMessage) => {
        switch (message.type) {
          case TaskExecutionOutputMessageType.RunCommand: {
            cliTaskProvider.executeTask(message.payload);
            break;
          }
          case TaskExecutionOutputMessageType.TaskExecutionFormInit: {
            publishMessagesToTaskExecutionForm(
              webviewPanel as WebviewPanel,
              schema
            );
            break;
          }
        }
      }
    );
  }

  if (!webviewPanelExists) webviewPanel.title = title;

  publishMessagesToTaskExecutionForm(webviewPanel, schema);

  webviewPanel?.reveal();

  getTelemetry().screenViewed(title);

  return webviewPanel;
}

function publishMessagesToTaskExecutionForm(
  webViewPanelRef: WebviewPanel,
  schema: TaskExecutionSchema
) {
  webViewPanelRef.webview.postMessage(
    new TaskExecutionSchemaInputMessage(schema)
  );
  webViewPanelRef.webview.postMessage(
    new TaskExecutionGlobalConfigurationInputMessage({
      enableTaskExecutionDryRunOnChange:
        !!GlobalConfigurationStore.instance.get(
          'enableTaskExecutionDryRunOnChange'
        ),
    })
  );
}

function setWebViewContent(
  webviewPanel: WebviewPanel,
  context: ExtensionContext
) {
  webviewPanel.webview.html = getIframeHtml(webviewPanel.webview, context);
}

export function getIframeHtml(webView: Webview, context: ExtensionContext) {
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

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>VscodeUi</title>
    <base href="/" />

    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <link href="${webView.asWebviewUri(stylePath)}" rel="stylesheet"/>
  </head>
  <body>
    <generate-ui-task-execution-form></generate-ui-task-execution-form>
    <script src="${webView.asWebviewUri(runtimePath)}"></script>
    <script src="${webView.asWebviewUri(mainPath)}"></script>
  </body>
</html>`;
}
