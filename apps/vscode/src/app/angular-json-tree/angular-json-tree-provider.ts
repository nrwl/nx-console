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
import { NgTaskProvider } from '../ng-task/ng-task-provider';
import {
  AngularJsonLabel,
  AngularJsonTreeItem
} from './angular-json-tree-item';

export class AngularJsonTreeProvider extends AbstractTreeProvider<
  AngularJsonTreeItem
> {
  constructor(
    context: ExtensionContext,
    private readonly ngTaskProvider: NgTaskProvider
  ) {
    super();

    commands.registerCommand('angularConsole.refreshAngularJsonTree', () =>
      this.refresh()
    );

    ([
      ['editAngularJson', this.editAngularJson],
      ['revealInExplorer', this.revealInExplorer],
      ['runTask', this.runTask]
    ] as [string, (item: AngularJsonTreeItem) => Promise<any>][]).forEach(
      ([commandSuffix, callback]) => {
        context.subscriptions.push(
          commands.registerCommand(
            `angularConsole.${commandSuffix}`,
            callback,
            this
          )
        );
      }
    );
  }

  setWorkspacePath(workspacePath: string) {
    if (this.ngTaskProvider.getWorkspacePath() !== workspacePath) {
      this.ngTaskProvider.setWorkspacePath(workspacePath);
    }
    this.refresh();
  }

  getParent(
    element: AngularJsonTreeItem
  ): AngularJsonTreeItem | null | undefined {
    const { project, architect } = element.angularJsonLabel;

    if (architect) {
      if (architect.configuration) {
        return this.createAngularJsonTreeItem(
          { project, architect: { name: architect.name } },
          architect.name
        );
      } else {
        return this.createAngularJsonTreeItem({ project }, project);
      }
    } else {
      return null;
    }
  }

  createAngularJsonTreeItem(
    angularJsonLabel: AngularJsonLabel,
    treeItemLabel: string,
    hasChildren?: boolean
  ) {
    const item = new AngularJsonTreeItem(
      angularJsonLabel,
      treeItemLabel,
      hasChildren
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None
    );
    item.command = {
      title: 'Edit angular.json',
      command: 'angularConsole.editAngularJson',
      arguments: [item]
    };
    if (!angularJsonLabel.architect) {
      const projectDef = this.ngTaskProvider.getProjects()[
        angularJsonLabel.project
      ];
      if (projectDef) {
        item.resourceUri = Uri.file(
          join(this.ngTaskProvider.getWorkspacePath()!, projectDef.root)
        );
      }
      item.contextValue = 'project';
    } else {
      item.contextValue = 'task';
    }

    return item;
  }

  getChildren(
    parent?: AngularJsonTreeItem
  ): ProviderResult<AngularJsonTreeItem[]> {
    if (!parent) {
      const projects = this.ngTaskProvider.getProjectEntries();
      return projects.map(
        ([name, def]): AngularJsonTreeItem =>
          this.createAngularJsonTreeItem(
            { project: name },
            name,
            Boolean(def.architect)
          )
      );
    }

    const { angularJsonLabel } = parent;
    const { architect, project } = angularJsonLabel;
    const projectDef = this.ngTaskProvider.getProjects()[project];

    if (!projectDef) {
      return;
    }

    if (!architect) {
      if (projectDef.architect) {
        return Object.keys(projectDef.architect).map(
          (name): AngularJsonTreeItem =>
            this.createAngularJsonTreeItem(
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

      return Object.keys(configurations).map(name => {
        const item = this.createAngularJsonTreeItem(
          { architect: { ...architect, configuration: name }, project },
          name
        );

        return item;
      });
    }
  }

  private findLabel(
    document: TextDocument,
    { project, architect }: AngularJsonLabel
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
      }
    };
    visit(document.getText(), visitor);

    return scriptOffset;
  }

  private async runTask(selection: AngularJsonTreeItem) {
    const { architect, project } = selection.angularJsonLabel;
    if (!architect) {
      return;
    }

    const flags = [];
    if (architect.configuration) {
      flags.push(`--configuration=${architect.configuration}`);
    }

    this.ngTaskProvider.executeTask({
      command: architect.name,
      positional: project,
      flags
    });
  }

  private async revealInExplorer(selection: AngularJsonTreeItem) {
    if (selection.resourceUri) {
      commands.executeCommand('revealInExplorer', selection.resourceUri);
    }
  }

  private async editAngularJson(selection: AngularJsonTreeItem) {
    const angularJson = Uri.file(
      join(this.ngTaskProvider.getWorkspacePath()!, 'angular.json')
    );
    const document: TextDocument = await workspace.openTextDocument(
      angularJson
    );
    const offset = this.findLabel(document, selection.angularJsonLabel);
    const position = document.positionAt(offset);
    await window.showTextDocument(document, {
      selection: new Selection(position, position)
    });
  }
}
