import { selectProject } from '@nx-console/vscode-nx-cli-quickpicks';
import {
  NxTreeItem,
  ProjectViewItem,
  TargetViewItem,
} from '@nx-console/vscode-nx-project-view';
import {
  getNxWorkspace,
  getProjectByPath,
} from '@nx-console/vscode-nx-workspace';
import { showNoProjectsMessage } from '@nx-console/vscode-utils';
import type { ProjectConfiguration } from 'nx/src/devkit-exports';
import { Disposable, Uri, commands, window } from 'vscode';
import { MessageType } from './graph-message-type';
import { GraphWebView } from './graph-webview';
import { onWorkspaceRefreshed } from '@nx-console/vscode-lsp-client';
import { NxCommandsTreeItem } from '@nx-console/vscode-nx-commands-view';
import { getTelemetry } from '@nx-console/vscode-telemetry';

export function legacyShowAll(graphWebView: GraphWebView) {
  graphWebView.showAllProjects();
}

export function legacyShowAffected(graphWebView: GraphWebView) {
  graphWebView.showAffectedProjects();
}

export function legacyFocus(graphWebView: GraphWebView, uri: Uri | undefined) {
  openProjectWithFile(graphWebView, uri, MessageType.focus);
}

export function legacySelect(graphWebView: GraphWebView, uri: Uri) {
  openProjectWithFile(graphWebView, uri, MessageType.select);
}

export function legacyFocusButton(
  graphWebView: GraphWebView,
  treeItem: NxTreeItem
) {
  const project = getProjectItem(treeItem);
  if (project) {
    graphWebView.projectInWebview(
      project.nxProject.project,
      undefined,
      MessageType.focus
    );
  }
}

export function legacySelectButton(
  graphWebView: GraphWebView,
  treeItem: NxTreeItem
) {
  const project = getProjectItem(treeItem);
  if (project) {
    graphWebView.projectInWebview(
      project.nxProject.project,
      undefined,
      MessageType.select
    );
  }
}

export function legacyTask(graphWebView: GraphWebView, uri: Uri | undefined) {
  openProjectWithFile(graphWebView, uri, MessageType.task);
}

export function legacyTaskButton(
  graphWebView: GraphWebView,
  item: NxCommandsTreeItem | NxTreeItem | [project: string, task: string]
) {
  if (item instanceof NxTreeItem) {
    const project = getTaskItem(item);
    if (project) {
      graphWebView.projectInWebview(
        project.nxProject.project,
        project.nxTarget.name,
        MessageType.task
      );
    }
  } else if (item instanceof NxCommandsTreeItem) {
    if (item.commandConfig.type === 'target') {
      graphWebView.showAllTasks(item.commandConfig.target);
    }
  } else graphWebView.projectInWebview(item[0], item[1], MessageType.task);
}

export function projectGraph() {
  const graphWebView = new GraphWebView();
  onWorkspaceRefreshed(() => graphWebView.refresh());

  return Disposable.from(
    graphWebView,
    commands.registerCommand('nx.graph.showAll', () => {
      getTelemetry().logUsage('graph.show-all');
      graphWebView.showAllProjects();
    }),
    commands.registerCommand('nx.graph.showAffected', () => {
      getTelemetry().logUsage('graph.show-affected');
      graphWebView.showAffectedProjects();
    }),
    commands.registerCommand('nx.graph.focus', async (uri: Uri | undefined) => {
      getTelemetry().logUsage('graph.focus-project', {
        source: uri ? 'explorer-context-menu' : 'command',
      });
      await openProjectWithFile(graphWebView, uri, MessageType.focus);
    }),
    commands.registerCommand('nx.graph.select', async (uri: Uri) => {
      getTelemetry().logUsage('graph.select-project');
      await openProjectWithFile(graphWebView, uri, MessageType.select);
    }),
    commands.registerCommand(
      'nx.graph.focus.button',
      async (treeItem: NxTreeItem) => {
        getTelemetry().logUsage('graph.focus-project', {
          source: 'projects-view',
        });
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
        getTelemetry().logUsage('graph.select-project', {
          source: 'projects-view',
        });
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
      getTelemetry().logUsage('graph.show-task');
      await openProjectWithFile(graphWebView, uri, MessageType.task);
    }),
    commands.registerCommand(
      'nx.graph.task.button',
      async (
        item: NxCommandsTreeItem | NxTreeItem | [project: string, task: string]
      ) => {
        getTelemetry().logUsage('graph.show-task', {
          source: 'projects-view',
        });

        if (item instanceof NxTreeItem) {
          const project = getTaskItem(item);
          if (project) {
            graphWebView.projectInWebview(
              project.nxProject.project,
              project.nxTarget.name,
              MessageType.task
            );
          }
        } else if (item instanceof NxCommandsTreeItem) {
          if (item.commandConfig.type === 'target') {
            graphWebView.showAllTasks(item.commandConfig.target);
          }
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
  let project: ProjectConfiguration | null | undefined = null;
  if (filePath) {
    project = await getProjectByPath(filePath);
  }
  if (!project) {
    const nxWorkspace = await getNxWorkspace();
    if (!nxWorkspace) {
      showNoProjectsMessage();
      return;
    }
    const { projectGraph } = nxWorkspace;

    const projectNames = Object.keys(projectGraph.nodes);

    if (projectNames.length === 0) {
      showNoProjectsMessage(true);
      return;
    }

    const selectedProjectName = await selectProject(projectNames);
    if (!selectedProjectName) {
      return;
    }
    project = projectGraph.nodes[selectedProjectName].data;
  }

  if (messageType === MessageType.task) {
    const targets = Object.keys(project?.targets ?? {});
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
