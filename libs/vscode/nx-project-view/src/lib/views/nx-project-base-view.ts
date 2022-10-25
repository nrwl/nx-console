import { ProjectConfiguration, TargetConfiguration } from '@nrwl/devkit';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { getOutputChannel } from '@nx-console/vscode/utils';
import { TreeDataProvider, TreeItemCollapsibleState } from 'vscode';
import {
  NxProject,
  NxProjectTreeItem,
  NxTargetTreeItem,
} from '../nx-project-tree-item';

export type ProjectViewStrategy<T> = Required<
  Pick<TreeDataProvider<T>, 'getChildren'>
>;

export abstract class BaseView {
  constructor(protected readonly cliTaskProvider: CliTaskProvider) {}

  createProjectTreeItem([projectName, { root, name, targets }]: [
    projectName: string,
    projectDefinition: ProjectConfiguration
  ]) {
    const hasChildren = !!targets;
    const nxProject = { project: name ?? projectName, root };

    if (root === undefined) {
      getOutputChannel().appendLine(
        `Project ${nxProject.project} has no root. This could be because of an error loading the workspace configuration.`
      );
    }

    return new NxProjectTreeItem(
      nxProject,
      this.cliTaskProvider.getWorkspacePath(),
      projectName,
      hasChildren
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None
    );
  }

  async createTargetsFromProject(parent: NxProjectTreeItem) {
    const { nxProject } = parent;

    const projectDef = (await this.cliTaskProvider.getProjects())[
      nxProject.project
    ];
    if (!projectDef) {
      return;
    }

    const { targets } = projectDef;
    if (!targets) {
      return;
    }

    return Promise.all(
      Object.entries(targets).map((target) =>
        this.createTargetTreeItem(nxProject, target)
      )
    );
  }

  createTargetTreeItem(
    nxProject: NxProject,
    [targetName, { configurations }]: [
      targetName: string,
      targetDefinition: TargetConfiguration
    ]
  ) {
    const hasChildren = !!configurations;
    return new NxTargetTreeItem(
      nxProject,
      { name: targetName },
      targetName,
      hasChildren
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None
    );
  }

  async createConfigurationsFromTarget(parent: NxTargetTreeItem) {
    const { nxProject, nxTarget } = parent;

    const projectDef = (await this.cliTaskProvider.getProjects())[
      nxProject.project
    ];
    if (!projectDef) {
      return;
    }

    const { targets } = projectDef;
    if (!targets) {
      return;
    }

    const target = targets[nxTarget.name];
    if (!target) {
      return;
    }

    const { configurations } = target;
    if (!configurations) {
      return;
    }

    return Promise.all(
      Object.keys(configurations).map(
        (configuration) =>
          new NxTargetTreeItem(
            nxProject,
            { name: nxTarget.name, configuration },
            configuration,
            TreeItemCollapsibleState.None
          )
      )
    );
  }
}
