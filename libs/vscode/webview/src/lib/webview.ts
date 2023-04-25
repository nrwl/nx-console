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
  runTargetTreeView: TreeView<RunTargetTreeItem>;
  contextMenuUri?: Uri;
  generator?: string;
}

export async function revealWebViewPanel({
  context,
  runTargetTreeItem,
  runTargetTreeView,
  contextMenuUri,
  generator,
}: RevealWebViewPanelConfig) {
  const { label, generatorType } = runTargetTreeItem;
  const schema = await getTaskExecutionSchema(
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
    (label as string) ?? ''
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
  title: string
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
        localResourceRoots: [Uri.joinPath(context.extensionUri, 'generate-ui')],
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
      watch(join(context.extensionPath, 'generate-ui'), () => {
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
        switch (message.payloadType) {
          case TaskExecutionOutputMessageType.RunCommand: {
            CliTaskProvider.instance.executeTask(message.payload);
            break;
          }
          case TaskExecutionOutputMessageType.TaskExecutionFormInit: {
            commands.executeCommand('workbench.action.focusActiveEditorGroup');
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
    'generate-ui',
    'styles.css'
  );
  const runtimePath = Uri.joinPath(
    context.extensionUri,
    'generate-ui',
    'runtime.js'
  );
  const mainPath = Uri.joinPath(context.extensionUri, 'generate-ui', 'main.js');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>VscodeUi</title>
    <base href="/" />

    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <link href="${webView.asWebviewUri(stylePath)}" rel="stylesheet"/>
    <style>
      body {
        color: var(--secondary-text-color);
      }
    </style>
  </head>
  <body>
    <generate-ui-task-execution-form></generate-ui-task-execution-form>
    <script src="${webView.asWebviewUri(runtimePath)}"></script>
    <script src="${webView.asWebviewUri(mainPath)}"></script>
  </body>
</html>`;
}
