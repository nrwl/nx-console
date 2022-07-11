import { findProjectWithPath } from '@nx-console/vscode/nx-workspace';
import { commands, Disposable, Uri, window, workspace } from 'vscode';
import { MessageType } from './graph-message-type';
import { generateProjectGraph } from './graph-process';
import { projectInWebview, webview } from './graph-webview';

export function projectGraph() {
  return Disposable.from(
    commands.registerCommand('nx.graph', async () => {
      generateProjectGraph();
      await webview();
    }),
    commands.registerCommand('nx.graph.focus', async (uri: Uri | undefined) => {
      await openProjectWithFile(uri, MessageType.focus);
    }),
    commands.registerCommand('nx.graph.select', async (uri: Uri) => {
      await openProjectWithFile(uri, MessageType.select);
    }),
    commands.registerCommand(
      'nx.graph.focus.button',
      async ({
        nxProject: { project: projectName },
      }: {
        nxProject: { project: string };
      }) => {
        projectInWebview(projectName, MessageType.focus);
      }
    ),
    commands.registerCommand(
      'nx.graph.select.button',
      async ({
        nxProject: { project: projectName },
      }: {
        nxProject: { project: string };
      }) => {
        projectInWebview(projectName, MessageType.select);
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
  uri: Uri | undefined,
  messageType: MessageType
) {
  let filePath;
  if (uri) {
    filePath = uri.fsPath;
  } else {
    filePath = window.activeTextEditor?.document.fileName;
  }

  const project = await findProjectWithPath(filePath);
  projectInWebview(project?.name, messageType);
}
