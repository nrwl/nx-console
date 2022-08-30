import { findProjectWithPath } from '@nx-console/vscode/nx-workspace';
import { getWorkspacePath } from '@nx-console/vscode/utils';
import { commands, Disposable, Uri, window } from 'vscode';
import { MessageType } from './graph-message-type';
import { GraphWebView } from './graph-webview';

export function projectGraph() {
  const graphWebView = new GraphWebView();

  return Disposable.from(
    graphWebView,
    commands.registerCommand('nx.graph.refresh', () => {
      graphWebView.refresh();
    }),
    commands.registerCommand('nx.graph.focus', async (uri: Uri | undefined) => {
      await openProjectWithFile(graphWebView, uri, MessageType.focus);
    }),
    commands.registerCommand('nx.graph.select', async (uri: Uri) => {
      await openProjectWithFile(graphWebView, uri, MessageType.select);
    }),
    commands.registerCommand(
      'nx.graph.focus.button',
      async ({
        nxProject: { project: projectName },
      }: {
        nxProject: { project: string };
      }) => {
        graphWebView.projectInWebview(projectName, MessageType.focus);
      }
    ),
    commands.registerCommand(
      'nx.graph.select.button',
      async ({
        nxProject: { project: projectName },
      }: {
        nxProject: { project: string };
      }) => {
        graphWebView.projectInWebview(projectName, MessageType.select);
      }
    )
  );
}

/**
 * Opens a project in the graph depending on URI or activeTextEditor
 * @param uri
 * @param messageType
 */
async function openProjectWithFile(
  webview: GraphWebView,
  uri: Uri | undefined,
  messageType: MessageType
) {
  let filePath;
  if (uri) {
    filePath = uri.fsPath;
  } else {
    filePath = window.activeTextEditor?.document.fileName;
  }

  const project = await findProjectWithPath(filePath, getWorkspacePath());
  webview.projectInWebview(project?.name, messageType);
}
