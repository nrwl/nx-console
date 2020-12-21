import { JSONVisitor, visit } from 'jsonc-parser';
import { join } from 'path';
import {
  commands,
  ExtensionContext,
  ProviderResult,
  Selection,
  TextDocument,
  TreeItemCollapsibleState,
  Uri,
  window,
  workspace
} from 'vscode';

import { AbstractTreeProvider } from '../abstract-tree-provider';
import { CliTaskProvider } from '../cli-task/cli-task-provider';
import {
  WorkspaceJsonLabel,
  WorkspaceJsonTreeItem
} from './workspace-json-tree-item';
import { verifyWorkspace } from '../verify-workspace/verify-workspace';

export let workspaceJsonTreeProvider: WorkspaceJsonTreeProvider;

export class WorkspaceJsonTreeProvider extends AbstractTreeProvider<
  WorkspaceJsonTreeItem
> {
  loading = true;

  constructor(
    context: ExtensionContext,
    private readonly cliTaskProvider: CliTaskProvider
  ) {
    super();

    workspaceJsonTreeProvider = this;

    commands.registerCommand('nxConsole.refreshNxProjectsTree', () =>
      this.refresh()
    );

    ([
      ['editWorkspaceJson', this.editWorkspaceJson],
      ['revealInExplorer', this.revealInExplorer],
      ['runTask', this.runTask]
    ] as [string, (item: WorkspaceJsonTreeItem) => Promise<any>][]).forEach(
      ([commandSuffix, callback]) => {
        context.subscriptions.push(
          commands.registerCommand(`nxConsole.${commandSuffix}`, callback, this)
        );
      }
    );
  }

  setWorkspaceJsonPathh(workspaceJsonPath: string) {
    if (this.cliTaskProvider.getWorkspaceJsonPath() !== workspaceJsonPath) {
      this.cliTaskProvider.setWorkspaceJsonPath(workspaceJsonPath);
    }
    this.refresh();
  }

  getParent(
    element: WorkspaceJsonTreeItem
  ): WorkspaceJsonTreeItem | null | undefined {
    const { project, target } = element.workspaceJsonLabel;

    if (target) {
      if (target && target.configuration) {
        return this.createWorkspaceJsonTreeItem(
          {
            project, target: { name: target.name }
          },
          target.name
        );
      } else {
        return this.createWorkspaceJsonTreeItem({ project }, project);
      }
    } else {
      return null;
    }
  }

  createWorkspaceJsonTreeItem(
    workspaceJsonLabel: WorkspaceJsonLabel,
    treeItemLabel: string,
    hasChildren?: boolean
  ) {
    const item = new WorkspaceJsonTreeItem(
      workspaceJsonLabel,
      treeItemLabel,
      hasChildren
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None
    );
    item.command = {
      title: 'Edit workspace definition',
      command: 'nxConsole.editWorkspaceJson',
      arguments: [item]
    };
    if (!workspaceJsonLabel.target) {
      const projectDef = this.cliTaskProvider.getProjects()[
        workspaceJsonLabel.project
      ];
      if (projectDef) {
        item.resourceUri = Uri.file(
          join(this.cliTaskProvider.getWorkspacePath()!, projectDef.root)
        );
      }
      item.contextValue = 'project';
    } else {
      item.contextValue = 'task';
    }

    return item;
  }

  getChildren(
    parent?: WorkspaceJsonTreeItem
  ): ProviderResult<WorkspaceJsonTreeItem[]> {
    if (this.loading) {
      setTimeout(() => {
        this.loading = false;
        this.refresh();
      });
      return [
        this.createWorkspaceJsonTreeItem({ project: 'Loading' }, 'Loading')
      ];
    }
    if (!parent) {
      const projects = this.cliTaskProvider.getProjectEntries();
      return projects.map(
        ([name, def]): WorkspaceJsonTreeItem =>
          this.createWorkspaceJsonTreeItem(
            { project: name },
            name,
            Boolean(def.targets || def.architect)
          )
      );
    }

    const { workspaceJsonLabel } = parent;
    const { target, project } = workspaceJsonLabel;
    const projectDef = this.cliTaskProvider.getProjects()[project];

    if (!projectDef) {
      return;
    }

    if (!target) {
      if (projectDef.targets || projectDef.architect) {
        return Object.keys({...projectDef.targets, ...projectDef.architect}).map(
          (name): WorkspaceJsonTreeItem =>
            this.createWorkspaceJsonTreeItem(
              { target: { name }, project },
              name,
              Boolean(
                (projectDef.targets && projectDef.targets[name].configurations) ||
                (projectDef.architect && projectDef.architect[name].configurations)
              )
            )
        );
      }
    } else {
      const { configuration } = target;

      if (configuration || !(projectDef.targets || projectDef.architect)) {
        return;
      }

      const configurations = target &&
        (projectDef.targets![target.name]!.configurations || projectDef.architect![target.name]!.configurations);
      if (!configurations) {
        return;
      }

      return Object.keys(configurations).map(name => {
        const item = this.createWorkspaceJsonTreeItem(
          { target: { ...target, configuration: name }, project },
          name
        );

        return item;
      });
    }
  }

  private findLabel(
    document: TextDocument,
    { project, target }: WorkspaceJsonLabel
  ): number {
    let scriptOffset = 0;
    let nestingLevel = 0;
    let inProjects = false;
    let inProject = false;
    let inTargets = false;
    let inTarget = false;

    const visitor: JSONVisitor = {
      onError() {
        return scriptOffset;
      },
      onObjectEnd() {
        nestingLevel--;
      },
      onObjectBegin() {
        nestingLevel++;
      },
      onObjectProperty(property: string, offset: number) {
        if (scriptOffset) {
          return;
        }

        if (property === 'projects' && nestingLevel === 1) {
          inProjects = true;
        } else if (inProjects && nestingLevel === 2 && property === project) {
          inProject = true;
          if (!target) {
            scriptOffset = offset;
          }
        } else if (
          inProject &&
          nestingLevel === 3 &&
          (property === 'targets' || property === 'architect')
        ) {
          inTargets = true;
        } else if (inTargets && target) {
          if (property === target.name && nestingLevel === 4) {
            inTarget = true;
            if (!target.configuration) {
              scriptOffset = offset;
            }
          } else if (
            inTarget &&
            nestingLevel === 6 &&
            property === target.configuration
          ) {
            scriptOffset = offset;
          }
        }
      }
    };
    visit(document.getText(), visitor);

    return scriptOffset;
  }

  private async runTask(selection: WorkspaceJsonTreeItem) {
    const { target, project } = selection.workspaceJsonLabel;
    if (!target) {
      return;
    }

    const flags = [];
    if (target.configuration) {
      flags.push(`--configuration=${target.configuration}`);
    }

    this.cliTaskProvider.executeTask({
      command: target.name,
      positional: project,
      flags
    });
  }

  revealWorkspaceJsonLabel(workspaceJsonLabel: WorkspaceJsonLabel) {
    this.editWorkspaceJson(
      workspaceJsonTreeProvider.createWorkspaceJsonTreeItem(
        workspaceJsonLabel,
        ''
      )
    );
  }

  private async revealInExplorer(selection: WorkspaceJsonTreeItem) {
    if (selection.resourceUri) {
      commands.executeCommand('revealInExplorer', selection.resourceUri);
    }
  }

  private async editWorkspaceJson(selection: WorkspaceJsonTreeItem) {
    const { validWorkspaceJson } = verifyWorkspace(
      this.cliTaskProvider.getWorkspacePath()
    );
    if (!validWorkspaceJson) {
      return;
    }

    const workspaceJson = Uri.file(
      join(this.cliTaskProvider.getWorkspaceJsonPath())
    );
    const document: TextDocument = await workspace.openTextDocument(
      workspaceJson
    );
    const offset = this.findLabel(document, selection.workspaceJsonLabel);
    const position = document.positionAt(offset);
    await window.showTextDocument(document, {
      selection: new Selection(position, position)
    });
  }
}
