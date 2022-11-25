import {
  NxTreeItem,
  ProjectViewItem,
} from '@nx-console/vscode/nx-project-view';
import { findProjectWithPath } from '@nx-console/vscode/nx-workspace';
import { getTelemetry, getWorkspacePath } from '@nx-console/vscode/utils';
import { commands, Disposable, Uri, window } from 'vscode';

import { MessageType } from './graph-message-type';
import { GraphWebView } from './graph-webview';

export function projectGraph() {
  const graphWebView = new GraphWebView();

  return Disposable.from(
    graphWebView,
    commands.registerCommand('nx.graph.refresh', () => {
      getTelemetry().featureUsed('nx.graph.refresh');
      graphWebView.refresh();
    }),
    commands.registerCommand('nx.graph.showAll', () => {
      getTelemetry().featureUsed('nx.graph.showAll');
      graphWebView.showAllProjects();
    }),
    commands.registerCommand('nx.graph.focus', async (uri: Uri | undefined) => {
      getTelemetry().featureUsed('nx.graph.focus');
      await openProjectWithFile(graphWebView, uri, MessageType.focus);
    }),
    commands.registerCommand('nx.graph.select', async (uri: Uri) => {
      getTelemetry().featureUsed('nx.graph.select');
      await openProjectWithFile(graphWebView, uri, MessageType.select);
    }),
    commands.registerCommand(
      'nx.graph.focus.button',
      async (treeItem: NxTreeItem) => {
        getTelemetry().featureUsed('nx.graph.focus.button');
        const project = getProjectItem(treeItem);
        if (project) {
          graphWebView.projectInWebview(
            project.nxProject.project,
            MessageType.focus
          );
        }
      }
    ),
    commands.registerCommand(
      'nx.graph.select.button',
      async (treeItem: NxTreeItem) => {
        getTelemetry().featureUsed('nx.graph.focus.button');
        const project = getProjectItem(treeItem);
        if (project) {
          graphWebView.projectInWebview(
            project.nxProject.project,
            MessageType.select
          );
        }
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
    if (!window.activeTextEditor) {
      window.showErrorMessage(
        'Error while opening the graph: No file is currently open.'
      );
      return;
    }
    filePath = window.activeTextEditor?.document.fileName;
  }

  const project = await findProjectWithPath(filePath, getWorkspacePath());
  if (!project) {
    window.showErrorMessage(
      `Error while opening the graph: No project can be found at \n ${filePath}`
    );
    return;
  }
  webview.projectInWebview(project?.name, messageType);
}

function getProjectItem(item: NxTreeItem): ProjectViewItem | undefined {
  if (item.contextValue === 'project') {
    return item.item as ProjectViewItem;
  }
}
