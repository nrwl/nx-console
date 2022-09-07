import { revealNxProject } from '@nx-console/vscode/nx-workspace';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import {
  AbstractTreeProvider,
  getOutputChannel,
} from '@nx-console/vscode/utils';
import { join } from 'path';
import {
  commands,
  ExtensionContext,
  TreeItemCollapsibleState,
  Uri,
} from 'vscode';
import { NxProject, NxProjectTreeItem } from './nx-project-tree-item';

/**
 * Provides data for the "Projects" tree view
 */
export class NxProjectTreeProvider extends AbstractTreeProvider<NxProjectTreeItem> {
  constructor(
    context: ExtensionContext,
    private readonly cliTaskProvider: CliTaskProvider
  ) {
    super();

    (
      [
        ['editWorkspaceJson', this.editWorkspaceJson],
        ['revealInExplorer', this.revealInExplorer],
        ['runTask', this.runTask],
        ['refreshNxProjectsTree', this.refreshNxProjectsTree],
      ] as [string, (item: NxProjectTreeItem) => Promise<unknown>][]
    ).forEach(([commandSuffix, callback]) => {
      context.subscriptions.push(
        commands.registerCommand(`nxConsole.${commandSuffix}`, callback, this)
      );
    });
  }

  async getParent(
    element: NxProjectTreeItem
  ): Promise<NxProjectTreeItem | null | undefined> {
    const { project, target, root } = element.nxProject;

    if (target) {
      if (target.configuration) {
        return this.createNxProjectTreeItem(
          { project, target: { name: target.name }, root },
          target.name
        );
      } else {
        return this.createNxProjectTreeItem({ project, root }, project);
      }
    } else {
      return null;
    }
  }

  async createNxProjectTreeItem(
    nxProject: NxProject,
    treeItemLabel: string,
    hasChildren?: boolean
  ) {
    const item = new NxProjectTreeItem(
      nxProject,
      treeItemLabel,
      hasChildren
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None
    );
    if (!nxProject.target) {
      const projectDef = (await this.cliTaskProvider.getProjects())[
        nxProject.project
      ];
      if (projectDef) {
        if (projectDef.root === undefined) {
          getOutputChannel().appendLine(
            `Project ${nxProject.project} has no root. This could be because of an error loading the workspace configuration.`
          );
        }

        item.resourceUri = Uri.file(
          join(this.cliTaskProvider.getWorkspacePath(), projectDef.root ?? '')
        );
      }
      item.contextValue = 'project';
    } else {
      item.contextValue = 'task';
    }

    return item;
  }

  async getChildren(
    parent?: NxProjectTreeItem
  ): Promise<NxProjectTreeItem[] | undefined> {
    if (!parent) {
      const projects = await this.cliTaskProvider.getProjectEntries();
      return Promise.all(
        projects.map(
          async ([name, def]): Promise<NxProjectTreeItem> =>
            this.createNxProjectTreeItem(
              { project: name, root: def.root },
              name,
              Boolean(def.targets)
            )
        )
      );
    }

    const { nxProject } = parent;
    const { target, project } = nxProject;
    const projectDef = (await this.cliTaskProvider.getProjects())[project];

    if (!projectDef) {
      return;
    }

    if (!target) {
      if (projectDef.targets) {
        return Promise.all(
          Object.keys(projectDef.targets).map(
            async (name): Promise<NxProjectTreeItem> =>
              this.createNxProjectTreeItem(
                { target: { name }, project, root: projectDef.root },
                name,
                Boolean(projectDef.targets?.[name].configurations)
              )
          )
        );
      }
    } else {
      const { configuration } = target;

      if (configuration || !projectDef.targets) {
        return;
      }

      const configurations = projectDef.targets
        ? projectDef.targets[target.name].configurations
        : undefined;
      if (!configurations) {
        return;
      }

      return Promise.all(
        Object.keys(configurations).map(async (name) =>
          this.createNxProjectTreeItem(
            {
              target: { ...target, configuration: name },
              project,
              root: projectDef.root,
            },
            name
          )
        )
      );
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
      selection.nxProject.root,
      selection.nxProject.target
    );
  }

  private async refreshNxProjectsTree() {
    this.refresh();
  }
}
