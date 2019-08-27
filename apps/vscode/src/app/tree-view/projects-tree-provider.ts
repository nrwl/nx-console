import { JSONVisitor, visit } from 'jsonc-parser';
import { join } from 'path';
import {
  commands,
  ProviderResult,
  Selection,
  tasks,
  TextDocument,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  window,
  workspace,
  ExtensionContext
} from 'vscode';

import { NgTaskProvider } from '../ng-task-provider/ng-task-provider';
import { AbstractTreeProvider } from './abstract-tree-provider';

export class AngularJsonTreeItem extends TreeItem {
  constructor(
    public angularJsonLabel: AngularJsonLabel,
    treeItemLabel: string,
    collapsibleState?: TreeItemCollapsibleState | undefined
  ) {
    super(treeItemLabel, collapsibleState);
  }
}

export class AngularJsonTreeProvider extends AbstractTreeProvider<
  AngularJsonTreeItem
> {
  constructor(
    context: ExtensionContext,
    private readonly ngTaskProvider: NgTaskProvider
  ) {
    super();

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

  setWorkspacePath(_workspacePath: string) {
    this.refresh();
  }

  getParent(
    _element: AngularJsonTreeItem
  ): AngularJsonTreeItem | null | undefined {
    return;
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
      item.resourceUri = Uri.file(
        join(this.ngTaskProvider.getWorkspacePath()!, projectDef.root)
      );
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

      const configurations =
        projectDef.architect[architect.name].configurations;
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
            nestingLevel === 5 &&
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

    return tasks.executeTask(
      this.ngTaskProvider.createTask({
        architectName: architect.name,
        projectName: project,
        configuration: architect.configuration,
        type: 'shell'
      })
    );
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

interface AngularJsonLabel {
  project: string;
  architect?: {
    name: string;
    configuration?: string;
  };
}
