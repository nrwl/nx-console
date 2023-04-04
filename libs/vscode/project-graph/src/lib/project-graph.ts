import { getTelemetry } from '@nx-console/vscode/utils';
import { commands, Disposable, Uri, window } from 'vscode';
import { MessageType } from './graph-message-type';
import { GraphWebView } from './graph-webview';
import {
  NxProject,
  NxTreeItem,
  ProjectViewItem,
  TargetViewItem,
} from '@nx-console/vscode/nx-project-view';
import {
  getNxWorkspace,
  getProjectByPath,
} from '@nx-console/vscode/nx-workspace';
import { RunTargetTreeItem } from '@nx-console/vscode/nx-run-target-view';

export function projectGraph() {
  const graphWebView = new GraphWebView();

  return Disposable.from(
    graphWebView,
    commands.registerCommand('nx.graph.refresh', () => {
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
            undefined,
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
            undefined,
            MessageType.select
          );
        }
      }
    ),
    commands.registerCommand('nx.graph.task', async (uri: Uri | undefined) => {
      getTelemetry().featureUsed('nx.graph.task');
      await openProjectWithFile(graphWebView, uri, MessageType.task);
    }),
    commands.registerCommand(
      'nx.graph.task.button',
      async (
        item: RunTargetTreeItem | NxTreeItem | [project: string, task: string]
      ) => {
        getTelemetry().featureUsed('nx.graph.task.button');

        if (item instanceof NxTreeItem) {
          const project = getTaskItem(item);
          if (project) {
            graphWebView.projectInWebview(
              project.nxProject.project,
              project.nxTarget.name,
              MessageType.task
            );
          }
        } else if (item instanceof RunTargetTreeItem) {
          const target = item.route;
          graphWebView.showAllTasks(target);
        } else
          graphWebView.projectInWebview(item[0], item[1], MessageType.task);
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

  const project = await getProjectByPath(filePath);
  if (!project) {
    window.showErrorMessage(
      `Error while opening the graph: No project can be found at \n ${filePath}`
    );
    return;
  }

  if (messageType === MessageType.task) {
    const targets = Object.keys(project.targets ?? {});
    if (targets.length === 0) {
      return;
    }

    const selectedTarget = await window.showQuickPick(targets);

    if (!selectedTarget) {
      return;
    }

    webview.projectInWebview(project?.name, selectedTarget, messageType);
  } else {
    webview.projectInWebview(project?.name, undefined, messageType);
  }
}

function getProjectItem(item: NxTreeItem): ProjectViewItem | undefined {
  if (item.contextValue === 'project') {
    return item.item as ProjectViewItem;
  }
}

function getTaskItem(item: NxTreeItem): TargetViewItem | undefined {
  if (item.contextValue === 'target') {
    return item.item as TargetViewItem;
  }
}
