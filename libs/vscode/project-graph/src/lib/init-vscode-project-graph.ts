import {
  selectProject,
  selectTarget,
} from '@nx-console/vscode/nx-cli-quickpicks';
import { NxTreeItem } from '@nx-console/vscode/nx-project-view';
import { RunTargetTreeItem } from '@nx-console/vscode/nx-run-target-view';
import {
  getNxVersion,
  getNxWorkspaceProjects,
  getProjectByPath,
} from '@nx-console/vscode/nx-workspace';
import {
  getTelemetry,
  showNoProjectAtPathMessage,
} from '@nx-console/vscode/utils';
import { ProjectConfiguration } from 'nx/src/devkit-exports';
import { gte } from 'semver';
import { ExtensionContext, Uri, commands, window } from 'vscode';
import { GraphWebviewManager } from './graph-webview-manager';
import { projectGraph } from './legacy-implementation/project-graph';

let graphWebviewManager: GraphWebviewManager | undefined;

export function getGraphWebviewManager(): GraphWebviewManager {
  if (!graphWebviewManager)
    throw new Error('GraphWebviewManager not initialized');
  return graphWebviewManager;
}

export async function initVscodeProjectGraph(context: ExtensionContext) {
  const nxVersion = await getNxVersion();
  if (gte(nxVersion.full, '17.3.0-beta.3')) {
    graphWebviewManager = new GraphWebviewManager(context);
    registerActions(graphWebviewManager);
  } else {
    context.subscriptions.push(projectGraph());
  }
}

function registerActions(graphWebviewManager: GraphWebviewManager) {
  // commands.registerCommand('nx.graph.refresh', () => {
  //   })
  commands.registerCommand('nx.graph.showAll', () => {
    getTelemetry().featureUsed('nx.graph.showAll');
    graphWebviewManager.showAllProjects();
  });
  commands.registerCommand('nx.graph.showAffected', () => {
    getTelemetry().featureUsed('nx.graph.showAffected');
    graphWebviewManager.showAffectedProjects();
  });
  commands.registerCommand('nx.graph.focus', async (uri: Uri | undefined) => {
    getTelemetry().featureUsed('nx.graph.focus');

    const project = await getProjectForContext(uri);

    if (project && project.name) {
      graphWebviewManager.focusProject(project.name);
    }
  });
  commands.registerCommand('nx.graph.select', async (uri: Uri) => {
    getTelemetry().featureUsed('nx.graph.select');

    const project = await getProjectForContext(uri);

    if (project && project.name) {
      graphWebviewManager.selectProject(project.name);
    }
  });
  commands.registerCommand(
    'nx.graph.focus.button',
    async (treeItem: NxTreeItem) => {
      getTelemetry().featureUsed('nx.graph.focus.button');
      const project = treeItem.getProject();
      if (project?.project) {
        graphWebviewManager.focusProject(project.project);
      }
    }
  );
  commands.registerCommand(
    'nx.graph.select.button',
    async (treeItem: NxTreeItem) => {
      getTelemetry().featureUsed('nx.graph.focus.button');
      const project = treeItem.getProject();
      if (project?.project) {
        graphWebviewManager.selectProject(project.project);
      }
    }
  );
  commands.registerCommand('nx.graph.task', async (uri: Uri | undefined) => {
    getTelemetry().featureUsed('nx.graph.task');
    const project = await getProjectForContext(uri);
    if (!project) return;

    const targets = project.targets;
    if (!targets || Object.keys(targets).length === 0) {
      window.showErrorMessage(
        `Project '${project.name}' has no targets defined.`
      );
      return;
    }

    const selectedTarget = await selectTarget(Object.keys(targets));

    if (selectedTarget && project.name) {
      graphWebviewManager.focusTarget(project.name, selectedTarget);
    }
  });
  commands.registerCommand(
    'nx.graph.task.button',
    async (
      item: RunTargetTreeItem | NxTreeItem | [project: string, task: string]
    ) => {
      getTelemetry().featureUsed('nx.graph.task.button');

      if (item instanceof NxTreeItem) {
        const project = item.getProject();
        const target = item.getTarget();
        if (project && target) {
          graphWebviewManager.focusTarget(project.project, target.name);
        }
      } else if (item instanceof RunTargetTreeItem) {
        const target = item.commandString;
        graphWebviewManager.showAllTargetsByName(target);
      } else if (Array.isArray(item))
        graphWebviewManager.focusTarget(item[0], item[1]);
    }
  );
}

async function getProjectForContext(
  uri: Uri | undefined
): Promise<ProjectConfiguration | undefined> {
  let filePath = uri?.fsPath;

  // if a uri file path is passed, we're running from a context menu and will open the graph right away
  if (filePath) {
    const project = await getProjectByPath(filePath);
    if (!project) {
      showNoProjectAtPathMessage(filePath);
      return;
    }
    return project;
  }

  // otherwise, we're running from the command pallette and will soft-assume the current file
  filePath = window.activeTextEditor?.document.uri.fsPath;
  const projects = await getNxWorkspaceProjects();
  const highlightedProject = filePath
    ? (await getProjectByPath(filePath))?.name
    : undefined;

  const selectedProjectName = await selectProject(Object.keys(projects), {
    highlightedProject,
  });
  if (!selectedProjectName) return;
  return projects[selectedProjectName];
}
