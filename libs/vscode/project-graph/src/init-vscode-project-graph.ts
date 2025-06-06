import {
  selectProject,
  selectTarget,
} from '@nx-console/vscode-nx-cli-quickpicks';
import { NxTreeItem } from '@nx-console/vscode-nx-project-view';
import {
  getNxVersion,
  getNxWorkspaceProjects,
  getProjectByPath,
} from '@nx-console/vscode-nx-workspace';
import { showNoProjectAtPathMessage } from '@nx-console/vscode-utils';
import type { ProjectConfiguration } from 'nx/src/devkit-exports';
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
import { showNoNxVersionMessage } from '@nx-console/vscode-output-channels';
import { NxCommandsTreeItem } from '@nx-console/vscode-nx-commands-view';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { gte } from '@nx-console/nx-version';

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
      getTelemetry().logUsage('graph.show-all');
      const nxVersion = await getNxVersion();
      if (!nxVersion) {
        showNoNxVersionMessage();
        return;
      }
      if (gte(nxVersion, '17.3.0-beta.3')) {
        graphWebviewManager.showAllProjects();
      } else {
        legacyShowAll(legacyGrapyWebView);
      }
    }),
    commands.registerCommand('nx.graph.showAffected', async () => {
      getTelemetry().logUsage('graph.show-affected');
      const nxVersion = await getNxVersion();
      if (!nxVersion) {
        showNoNxVersionMessage();
        return;
      }
      if (gte(nxVersion, '17.3.0-beta.3')) {
        graphWebviewManager.showAffectedProjects();
      } else {
        legacyShowAffected(legacyGrapyWebView);
      }
    }),
    commands.registerCommand(
      'nx.graph.focus',
      async (uriOrProjectName: Uri | string | undefined) => {
        getTelemetry().logUsage('graph.focus-project', {
          source:
            uriOrProjectName instanceof Uri
              ? 'explorer-context-menu'
              : 'command',
        });
        const nxVersion = await getNxVersion();
        if (!nxVersion) {
          showNoNxVersionMessage();
          return;
        }
        if (gte(nxVersion, '17.3.0-beta.3')) {
          if (typeof uriOrProjectName === 'string') {
            graphWebviewManager.focusProject(uriOrProjectName);
            return;
          }

          const project = await getProjectForContext(uriOrProjectName);

          if (project && project.name) {
            graphWebviewManager.focusProject(project.name);
          }
        } else {
          legacyFocus(
            legacyGrapyWebView,
            uriOrProjectName instanceof Uri ? uriOrProjectName : undefined,
          );
        }
      },
    ),
    commands.registerCommand('nx.graph.select', async (uri: Uri) => {
      getTelemetry().logUsage('graph.select-project', {
        source: uri ? 'explorer-context-menu' : 'command',
      });
      const nxVersion = await getNxVersion();
      if (!nxVersion) {
        showNoNxVersionMessage();
        return;
      }
      if (gte(nxVersion, '17.3.0-beta.3')) {
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
        getTelemetry().logUsage('graph.focus-project', {
          source: 'projects-view',
        });
        const nxVersion = await getNxVersion();
        if (!nxVersion) {
          showNoNxVersionMessage();
          return;
        }
        if (gte(nxVersion, '17.3.0-beta.3')) {
          const project = treeItem.getProject();
          if (project?.project) {
            graphWebviewManager.focusProject(project.project);
          }
        } else {
          legacyFocusButton(legacyGrapyWebView, treeItem);
        }
      },
    ),
    commands.registerCommand(
      'nx.graph.select.button',
      async (treeItem: NxTreeItem) => {
        getTelemetry().logUsage('graph.select-project', {
          source: 'projects-view',
        });
        const nxVersion = await getNxVersion();
        if (!nxVersion) {
          showNoNxVersionMessage();
          return;
        }
        if (gte(nxVersion, '17.3.0-beta.3')) {
          const project = treeItem.getProject();
          if (project?.project) {
            graphWebviewManager.selectProject(project.project);
          }
        } else {
          legacySelectButton(legacyGrapyWebView, treeItem);
        }
      },
    ),
    commands.registerCommand(
      'nx.graph.task',
      async (
        uriOrTaskParams:
          | Uri
          | { projectName: string; taskName: string }
          | undefined,
      ) => {
        getTelemetry().logUsage('graph.show-task', {
          source:
            uriOrTaskParams instanceof Uri
              ? 'explorer-context-menu'
              : 'command',
        });
        const nxVersion = await getNxVersion();
        if (!nxVersion) {
          showNoNxVersionMessage();
          return;
        }
        if (gte(nxVersion, '17.3.0-beta.3')) {
          // If direct project and task names were provided
          if (
            typeof uriOrTaskParams === 'object' &&
            !(uriOrTaskParams instanceof Uri)
          ) {
            const { projectName, taskName } = uriOrTaskParams;
            graphWebviewManager.focusTarget(projectName, taskName);
            return;
          }

          // Otherwise, continue with the existing URI-based logic
          const project = await getProjectForContext(
            uriOrTaskParams instanceof Uri ? uriOrTaskParams : undefined,
          );
          if (!project) return;

          const targets = project.targets;
          if (!targets || Object.keys(targets).length === 0) {
            window.showErrorMessage(
              `Project '${project.name}' has no targets defined.`,
            );
            return;
          }

          const selectedTarget = await selectTarget(Object.keys(targets));

          if (selectedTarget && project.name) {
            graphWebviewManager.focusTarget(project.name, selectedTarget);
          }
        } else {
          legacyTask(
            legacyGrapyWebView,
            uriOrTaskParams instanceof Uri ? uriOrTaskParams : undefined,
          );
        }
      },
    ),
    commands.registerCommand(
      'nx.graph.task.button',
      async (
        item: NxCommandsTreeItem | NxTreeItem | [project: string, task: string],
      ) => {
        getTelemetry().logUsage('graph.show-task', {
          source: 'projects-view',
        });
        const nxVersion = await getNxVersion();
        if (!nxVersion) {
          showNoNxVersionMessage();
          return;
        }
        if (gte(nxVersion, '17.3.0-beta.3')) {
          if (item instanceof NxTreeItem) {
            const project = item.getProject();
            const target = item.getTarget();
            if (project && target) {
              graphWebviewManager.focusTarget(project.project, target.name);
            }
          } else if (item instanceof NxCommandsTreeItem) {
            if (item.commandConfig.type === 'target') {
              graphWebviewManager.showAllTargetsByName(
                item.commandConfig.target,
              );
            }
          } else if (Array.isArray(item))
            graphWebviewManager.focusTarget(item[0], item[1]);
        } else {
          legacyTaskButton(legacyGrapyWebView, item);
        }
      },
    ),
  );
}

async function getProjectForContext(
  uri: Uri | undefined,
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
  return projects[selectedProjectName].data;
}
