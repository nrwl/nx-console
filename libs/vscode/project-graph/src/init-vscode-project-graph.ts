import { gte } from '@nx-console/nx-version';
import {
  selectProject,
  selectTarget,
} from '@nx-console/vscode-nx-cli-quickpicks';
import { NxCommandsTreeItem } from '@nx-console/vscode-nx-commands-view';
import { NxTreeItem } from '@nx-console/vscode-nx-project-view';
import {
  getNxVersion,
  getNxWorkspaceProjects,
  getProjectByPath,
} from '@nx-console/vscode-nx-workspace';
import { showNoNxVersionMessage } from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { showNoProjectAtPathMessage } from '@nx-console/vscode-utils';
import type { ProjectConfiguration } from 'nx/src/devkit-exports';
import { ExtensionContext, Uri, commands, window } from 'vscode';
import {
  GraphWebviewManager,
  Legacy2GraphWebviewManager,
} from './legacy-2-graph-webview-manager';
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
import { NewGraphWebview } from './new-graph-webview';
import { NewGraphWebviewManager } from './new-graph-webview-manager';

let _legacy2GraphWebviewManager: Legacy2GraphWebviewManager | undefined;
const _newGraphWebviewManager = new NewGraphWebviewManager();

export async function getGraphWebviewManager(): Promise<
  GraphWebviewManager<unknown>
> {
  const nxVersion = await getNxVersion();
  if (!nxVersion) {
    return _newGraphWebviewManager;
  }
  if (gte(nxVersion, '21.4.0')) {
    return _newGraphWebviewManager;
  }
  if (!_legacy2GraphWebviewManager) {
    throw new Error('LegacyGraphWebviewManager not initialized');
  }
  return _legacy2GraphWebviewManager;
}

export async function initVscodeProjectGraph(context: ExtensionContext) {
  _legacy2GraphWebviewManager = new Legacy2GraphWebviewManager(context);

  const legacyGrapyWebView = new GraphWebView();

  context.subscriptions.push(
    _legacy2GraphWebviewManager,
    legacyGrapyWebView,
    // Temporary simple command to open the new state-machine powered graph webview
    commands.registerCommand('nx.graph.new', async () => {
      // const newGraphWebviewManager = new NewGraphWebview();
      // newGraphWebviewManager.reveal();
      // await newGraphWebviewManager.sendCommandToGraph({
      //   type: 'showAll',
      //   autoExpand: true,
      // });
      // await setTimeout(10000);
      // const result = await newGraphWebviewManager.sendCommandToGraph({
      //   type: 'excludeNode',
      //   nodeIds: ['project-latest-angular-generator-issue-e2e'],
      // });
      // console.log(`AAAA`, result);
    }),
    commands.registerCommand('nx.graph.showAll', async () => {
      getTelemetry().logUsage('graph.show-all');
      const nxVersion = await getNxVersion();
      if (!nxVersion) {
        showNoNxVersionMessage();
        return;
      }
      if (gte(nxVersion, '21.4.0')) {
        _newGraphWebviewManager.showAllProjects();
      } else if (gte(nxVersion, '17.3.0-beta.3')) {
        _legacy2GraphWebviewManager.showAllProjects();
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

      if (gte(nxVersion, '21.4.0')) {
        _newGraphWebviewManager.showAffectedProjects();
      } else if (!gte(nxVersion, '17.3.0-beta.3')) {
        legacyShowAffected(legacyGrapyWebView);
      } else {
        _legacy2GraphWebviewManager.showAffectedProjects();
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

        if (!gte(nxVersion, '17.3.0-beta.3')) {
          legacyFocus(
            legacyGrapyWebView,
            uriOrProjectName instanceof Uri ? uriOrProjectName : undefined,
          );
        } else {
          if (typeof uriOrProjectName === 'string') {
            if (gte(nxVersion, '21.4.0')) {
              _newGraphWebviewManager.focusProject(uriOrProjectName);
            } else {
              _legacy2GraphWebviewManager.focusProject(uriOrProjectName);
            }
            return;
          }
          const project = await getProjectForContext(uriOrProjectName);

          if (project && project.name) {
            if (gte(nxVersion, '21.4.0')) {
              _newGraphWebviewManager.focusProject(project.name);
            } else {
              _legacy2GraphWebviewManager.focusProject(project.name);
            }
          }
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
      if (!gte(nxVersion, '17.3.0-beta.3')) {
        legacySelect(legacyGrapyWebView, uri);
      } else {
        const project = await getProjectForContext(uri);

        if (project && project.name) {
          if (gte(nxVersion, '21.4.0')) {
            _newGraphWebviewManager.selectProject(project.name);
          } else {
            _legacy2GraphWebviewManager.selectProject(project.name);
          }
        }
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
        if (!gte(nxVersion, '17.3.0-beta.3')) {
          legacyFocusButton(legacyGrapyWebView, treeItem);
        } else {
          const project = treeItem.getProject();
          if (project?.project) {
            if (gte(nxVersion, '21.4.0')) {
              _newGraphWebviewManager.focusProject(project.project);
            } else {
              _legacy2GraphWebviewManager.focusProject(project.project);
            }
          }
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
        if (!gte(nxVersion, '17.3.0-beta.3')) {
          legacySelectButton(legacyGrapyWebView, treeItem);
        } else {
          const project = treeItem.getProject();
          if (project?.project) {
            if (gte(nxVersion, '21.4.0')) {
              _newGraphWebviewManager.selectProject(project.project);
            } else {
              _legacy2GraphWebviewManager.selectProject(project.project);
            }
          }
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
        if (!gte(nxVersion, '17.3.0-beta.3')) {
          legacyTask(
            legacyGrapyWebView,
            uriOrTaskParams instanceof Uri ? uriOrTaskParams : undefined,
          );
        } else {
          // If direct project and task names were provided
          if (
            typeof uriOrTaskParams === 'object' &&
            !(uriOrTaskParams instanceof Uri)
          ) {
            const { projectName, taskName } = uriOrTaskParams;
            if (gte(nxVersion, '21.4.0')) {
              _newGraphWebviewManager.focusTarget(projectName, taskName);
            } else {
              _legacy2GraphWebviewManager.focusTarget(projectName, taskName);
            }
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
            if (gte(nxVersion, '21.4.0')) {
              _newGraphWebviewManager.focusTarget(project.name, selectedTarget);
            } else {
              _legacy2GraphWebviewManager.focusTarget(
                project.name,
                selectedTarget,
              );
            }
          }
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
        if (!gte(nxVersion, '17.3.0-beta.3')) {
          legacyTaskButton(legacyGrapyWebView, item);
        } else {
          if (item instanceof NxTreeItem) {
            const project = item.getProject();
            const target = item.getTarget();
            if (project && target) {
              if (gte(nxVersion, '21.4.0')) {
                _newGraphWebviewManager.focusTarget(
                  project.project,
                  target.name,
                );
              } else {
                _legacy2GraphWebviewManager.focusTarget(
                  project.project,
                  target.name,
                );
              }
            }
          } else if (item instanceof NxCommandsTreeItem) {
            if (item.commandConfig.type === 'target') {
              if (gte(nxVersion, '21.4.0')) {
                _newGraphWebviewManager.showAllTargetsByName(
                  item.commandConfig.target,
                );
              } else {
                _legacy2GraphWebviewManager.showAllTargetsByName(
                  item.commandConfig.target,
                );
              }
            }
          } else if (Array.isArray(item)) {
            if (gte(nxVersion, '21.4.0')) {
              _newGraphWebviewManager.focusTarget(item[0], item[1]);
            } else {
              _legacy2GraphWebviewManager.focusTarget(item[0], item[1]);
            }
          }
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
