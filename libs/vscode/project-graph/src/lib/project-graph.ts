import { selectProject } from '@nx-console/vscode/nx-cli-quickpicks';
import {
  NxTreeItem,
  ProjectViewItem,
  TargetViewItem,
} from '@nx-console/vscode/nx-project-view';
import { RunTargetTreeItem } from '@nx-console/vscode/nx-run-target-view';
import {
  getNxWorkspace,
  getProjectByPath,
} from '@nx-console/vscode/nx-workspace';
import { getTelemetry, showNoProjectsMessage } from '@nx-console/vscode/utils';
import { ProjectConfiguration } from 'nx/src/devkit-exports';
import { Disposable, Uri, commands, window } from 'vscode';
import { MessageType } from './graph-message-type';
import { GraphWebView } from './graph-webview';

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
    commands.registerCommand('nx.graph.showAffected', () => {
      getTelemetry().featureUsed('nx.graph.showAffected');
      graphWebView.showAffectedProjects();
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
          const target = item.commandString;
          graphWebView.showAllTasks(target);
        } else
          graphWebView.projectInWebview(item[0], item[1], MessageType.task);
      }
    )
  );
}

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
  // we try to infer the project based on the current path
  // if it's not possible, just ask the user
  let project: ProjectConfiguration | null = null;
  if (filePath) {
    project = await getProjectByPath(filePath);
  }
  if (!project) {
    const {
      workspace: { projects },
    } = await getNxWorkspace();

    const projectNames = Object.keys(projects);

    if (projectNames.length === 0) {
      showNoProjectsMessage();
      return;
    }

    const selectedProjectName = await selectProject(projectNames);
    if (!selectedProjectName) {
      return;
    }
    project = projects[selectedProjectName];
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
