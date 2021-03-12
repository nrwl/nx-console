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
  workspace,
} from 'vscode';

import { AbstractTreeProvider } from '../abstract-tree-provider';
import { CliTaskProvider } from '../cli-task/cli-task-provider';
import { NxProjectLabel, NxProjectTreeItem } from './nx-project-tree-item';
import { verifyWorkspace } from '../verify-workspace/verify-workspace';

export let nxProjectTreeProvider: NxProjectTreeProvider;

/**
 * Provides data for the "Projects" tree view
 */
export class NxProjectTreeProvider extends AbstractTreeProvider<NxProjectTreeItem> {
  loading = true;

  constructor(
    context: ExtensionContext,
    private readonly cliTaskProvider: CliTaskProvider
  ) {
    super();

    nxProjectTreeProvider = this;

    commands.registerCommand('nxConsole.refreshNxProjectsTree', () =>
      this.refresh()
    );

    ([
      ['editWorkspaceJson', this.editWorkspaceJson],
      ['revealInExplorer', this.revealInExplorer],
      ['runTask', this.runTask],
    ] as [string, (item: NxProjectTreeItem) => Promise<any>][]).forEach(
      ([commandSuffix, callback]) => {
        context.subscriptions.push(
          commands.registerCommand(`nxConsole.${commandSuffix}`, callback, this)
        );
      }
    );
  }

  setWorkspaceJsonPath(workspaceJsonPath: string) {
    if (this.cliTaskProvider.getWorkspaceJsonPath() !== workspaceJsonPath) {
      this.cliTaskProvider.setWorkspaceJsonPath(workspaceJsonPath);
    }
    this.refresh();
  }

  getParent(element: NxProjectTreeItem): NxProjectTreeItem | null | undefined {
    const { project, architect } = element.workspaceJsonLabel;

    if (architect) {
      if (architect.configuration) {
        return this.createNxProjectTreeItem(
          { project, architect: { name: architect.name } },
          architect.name
        );
      } else {
        return this.createNxProjectTreeItem({ project }, project);
      }
    } else {
      return null;
    }
  }

  createNxProjectTreeItem(
    workspaceJsonLabel: NxProjectLabel,
    treeItemLabel: string,
    hasChildren?: boolean
  ) {
    const item = new NxProjectTreeItem(
      workspaceJsonLabel,
      treeItemLabel,
      hasChildren
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None
    );
    item.command = {
      title: 'Edit workspace definition',
      command: 'nxConsole.editWorkspaceJson',
      arguments: [item],
    };
    if (!workspaceJsonLabel.architect) {
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

  getChildren(parent?: NxProjectTreeItem): ProviderResult<NxProjectTreeItem[]> {
    if (this.loading) {
      setTimeout(() => {
        this.loading = false;
        this.refresh();
      });
      return [this.createNxProjectTreeItem({ project: 'Loading' }, 'Loading')];
    }
    if (!parent) {
      const projects = this.cliTaskProvider.getProjectEntries();
      return projects.map(
        ([name, def]): NxProjectTreeItem =>
          this.createNxProjectTreeItem(
            { project: name },
            name,
            Boolean(def.architect)
          )
      );
    }

    const { workspaceJsonLabel } = parent;
    const { architect, project } = workspaceJsonLabel;
    const projectDef = this.cliTaskProvider.getProjects()[project];

    if (!projectDef) {
      return;
    }

    if (!architect) {
      if (projectDef.architect) {
        return Object.keys(projectDef.architect).map(
          (name): NxProjectTreeItem =>
            this.createNxProjectTreeItem(
              { architect: { name }, project },
              name,
              Boolean(projectDef.architect![name].configurations)
            )
        );
      }
    } else {
      const { configuration } = architect;

      if (configuration || !projectDef.architect) {
        return;
      }

      const configurations = projectDef.architect
        ? projectDef.architect[architect.name].configurations
        : undefined;
      if (!configurations) {
        return;
      }

      return Object.keys(configurations).map((name) => {
        const item = this.createNxProjectTreeItem(
          { architect: { ...architect, configuration: name }, project },
          name
        );

        return item;
      });
    }
  }

  private findLabel(
    document: TextDocument,
    { project, architect }: NxProjectLabel
  ): number {
    let scriptOffset = 0;
    let nestingLevel = 0;
    let inProjects = false;
    let inProject = false;
    let inArchitects = false;
    let inArchitect = false;

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
          if (!architect) {
            scriptOffset = offset;
          }
        } else if (
          inProject &&
          nestingLevel === 3 &&
          property === 'architect'
        ) {
          inArchitects = true;
        } else if (inArchitects && architect) {
          if (property === architect.name && nestingLevel === 4) {
            inArchitect = true;
            if (!architect.configuration) {
              scriptOffset = offset;
            }
          } else if (
            inArchitect &&
            nestingLevel === 6 &&
            property === architect.configuration
          ) {
            scriptOffset = offset;
          }
        }
      },
    };
    visit(document.getText(), visitor);

    return scriptOffset;
  }

  private async runTask(selection: NxProjectTreeItem) {
    const { architect, project } = selection.workspaceJsonLabel;
    if (!architect) {
      return;
    }

    const flags = [];
    if (architect.configuration) {
      flags.push(`--configuration=${architect.configuration}`);
    }

    this.cliTaskProvider.executeTask({
      command: architect.name,
      positional: project,
      flags,
    });
  }

  revealNxProjectLabel(workspaceJsonLabel: NxProjectLabel) {
    this.editWorkspaceJson(
      nxProjectTreeProvider.createNxProjectTreeItem(workspaceJsonLabel, '')
    );
  }

  private async revealInExplorer(selection: NxProjectTreeItem) {
    if (selection.resourceUri) {
      commands.executeCommand('revealInExplorer', selection.resourceUri);
    }
  }

  private async editWorkspaceJson(selection: NxProjectTreeItem) {
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
      selection: new Selection(position, position),
    });
  }
}
