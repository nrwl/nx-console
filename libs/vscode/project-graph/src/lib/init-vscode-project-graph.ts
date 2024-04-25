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
  showNoNxVersionMessage,
  showNoProjectAtPathMessage,
} from '@nx-console/vscode/utils';
import type { ProjectConfiguration } from 'nx/src/devkit-exports';
import { gte } from 'semver';
import { ExtensionContext, Uri, commands, window } from 'vscode';
import { GraphWebviewManager } from './graph-webview-manager';
import { GraphWebView } from './legacy-implementation/graph-webview';
import {
  legacyFocus,
  legacyFocusButton,
  legacySelect,
  legacySelectButton,
  legacyShowAffected,
  legacyShowAll,
  legacyTask,
  legacyTaskButton,
} from './legacy-implementation/project-graph';

let _graphWebviewManager: GraphWebviewManager | undefined;

export function getGraphWebviewManager(): GraphWebviewManager {
  if (!_graphWebviewManager)
    throw new Error('GraphWebviewManager not initialized');
  return _graphWebviewManager;
}

export async function initVscodeProjectGraph(context: ExtensionContext) {
  const graphWebviewManager = new GraphWebviewManager(context);
  _graphWebviewManager = graphWebviewManager;
  const legacyGrapyWebView = new GraphWebView();

  context.subscriptions.push(
    graphWebviewManager,
    legacyGrapyWebView,
    commands.registerCommand('nx.graph.showAll', async () => {
      getTelemetry().featureUsed('nx.graph.showAll');
      const nxVersion = await getNxVersion();
      if (!nxVersion) {
        showNoNxVersionMessage();
        return;
      }
      if (gte(nxVersion.full, '17.3.0-beta.3')) {
        graphWebviewManager.showAllProjects();
      } else {
        legacyShowAll(legacyGrapyWebView);
      }
    }),
    commands.registerCommand('nx.graph.showAffected', async () => {
      getTelemetry().featureUsed('nx.graph.showAffected');
      const nxVersion = await getNxVersion();
      if (!nxVersion) {
        showNoNxVersionMessage();
        return;
      }
      if (gte(nxVersion.full, '17.3.0-beta.3')) {
        graphWebviewManager.showAffectedProjects();
      } else {
        legacyShowAffected(legacyGrapyWebView);
      }
    }),
    commands.registerCommand('nx.graph.focus', async (uri: Uri | undefined) => {
      getTelemetry().featureUsed('nx.graph.focus');
      const nxVersion = await getNxVersion();
      if (!nxVersion) {
        showNoNxVersionMessage();
        return;
      }
      if (gte(nxVersion.full, '17.3.0-beta.3')) {
        const project = await getProjectForContext(uri);

        if (project && project.name) {
          graphWebviewManager.focusProject(project.name);
        }
      } else {
        legacyFocus(legacyGrapyWebView, uri);
      }
    }),
    commands.registerCommand('nx.graph.select', async (uri: Uri) => {
      getTelemetry().featureUsed('nx.graph.select');
      const nxVersion = await getNxVersion();
      if (!nxVersion) {
        showNoNxVersionMessage();
        return;
      }
      if (gte(nxVersion.full, '17.3.0-beta.3')) {
        const project = await getProjectForContext(uri);

        if (project && project.name) {
          graphWebviewManager.selectProject(project.name);
        }
      } else {
        legacySelect(legacyGrapyWebView, uri);
      }
    }),
    commands.registerCommand(
      'nx.graph.focus.button',
      async (treeItem: NxTreeItem) => {
        getTelemetry().featureUsed('nx.graph.focus.button');
        const nxVersion = await getNxVersion();
        if (!nxVersion) {
          showNoNxVersionMessage();
          return;
        }
        if (gte(nxVersion.full, '17.3.0-beta.3')) {
          const project = treeItem.getProject();
          if (project?.project) {
            graphWebviewManager.focusProject(project.project);
          }
        } else {
          legacyFocusButton(legacyGrapyWebView, treeItem);
        }
      }
    ),
    commands.registerCommand(
      'nx.graph.select.button',
      async (treeItem: NxTreeItem) => {
        getTelemetry().featureUsed('nx.graph.focus.button');
        const nxVersion = await getNxVersion();
        if (!nxVersion) {
          showNoNxVersionMessage();
          return;
        }
        if (gte(nxVersion.full, '17.3.0-beta.3')) {
          const project = treeItem.getProject();
          if (project?.project) {
            graphWebviewManager.selectProject(project.project);
          }
        } else {
          legacySelectButton(legacyGrapyWebView, treeItem);
        }
      }
    ),
    commands.registerCommand('nx.graph.task', async (uri: Uri | undefined) => {
      getTelemetry().featureUsed('nx.graph.task');
      const nxVersion = await getNxVersion();
      if (!nxVersion) {
        showNoNxVersionMessage();
        return;
      }
      if (gte(nxVersion.full, '17.3.0-beta.3')) {
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
      } else {
        legacyTask(legacyGrapyWebView, uri);
      }
    }),
    commands.registerCommand(
      'nx.graph.task.button',
      async (
        item: RunTargetTreeItem | NxTreeItem | [project: string, task: string]
      ) => {
        getTelemetry().featureUsed('nx.graph.task.button');
        const nxVersion = await getNxVersion();
        if (!nxVersion) {
          showNoNxVersionMessage();
          return;
        }
        if (gte(nxVersion.full, '17.3.0-beta.3')) {
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
        } else {
          legacyTaskButton(legacyGrapyWebView, item);
        }
      }
    )
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
