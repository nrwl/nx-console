import { join } from 'path';
import {
  commands,
  ExtensionContext,
  ProviderResult,
  TreeItemCollapsibleState,
  Uri,
} from 'vscode';

import { AbstractTreeProvider } from '@nx-console/server';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { NxProject, NxProjectTreeItem } from './nx-project-tree-item';

import { revealNxProject } from '@nx-console/vscode/nx-workspace';

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

  getParent(element: NxProjectTreeItem): NxProjectTreeItem | null | undefined {
    const { project, target } = element.nxProject;

    if (target) {
      if (target.configuration) {
        return this.createNxProjectTreeItem(
          { project, target: { name: target.name } },
          target.name
        );
      } else {
        return this.createNxProjectTreeItem({ project }, project);
      }
    } else {
      return null;
    }
  }

  createNxProjectTreeItem(
    workspaceJsonLabel: NxProject,
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

    const { nxProject } = parent;
    const { target, project } = nxProject;
    const projectDef = this.cliTaskProvider.getProjects()[project];

    if (!projectDef) {
      return;
    }

    if (!target) {
      if (projectDef.architect) {
        return Object.keys(projectDef.architect).map(
          (name): NxProjectTreeItem =>
            this.createNxProjectTreeItem(
              { target: { name }, project },
              name,
              Boolean(projectDef.architect![name].configurations)
            )
        );
      }
    } else {
      const { configuration } = target;

      if (configuration || !projectDef.architect) {
        return;
      }

      const configurations = projectDef.architect
        ? projectDef.architect[target.name].configurations
        : undefined;
      if (!configurations) {
        return;
      }

      return Object.keys(configurations).map((name) => {
        const item = this.createNxProjectTreeItem(
          { target: { ...target, configuration: name }, project },
          name
        );

        return item;
      });
    }
  }

  private async runTask(selection: NxProjectTreeItem) {
    const { target, project } = selection.nxProject;
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
      flags,
    });
  }

  private async revealInExplorer(selection: NxProjectTreeItem) {
    if (selection.resourceUri) {
      commands.executeCommand('revealInExplorer', selection.resourceUri);
    }
  }

  private async editWorkspaceJson(selection: NxProjectTreeItem) {
    return revealNxProject(
      selection.nxProject.project,
      selection.nxProject.target
    );
  }
}
