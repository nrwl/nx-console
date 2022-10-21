import { ProjectConfiguration, TargetConfiguration } from '@nrwl/devkit';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { getOutputChannel } from '@nx-console/vscode/utils';
import { join } from 'path';
import { TreeItemCollapsibleState, Uri } from 'vscode';
import { ListViewStrategy } from './nx-project-helper';
import {
  NxListViewItem,
  NxProject,
  NxProjectTreeItem,
  NxTargetTreeItem,
} from './nx-project-tree-item';

export function createListViewStrategy(
  cliTaskProvider: CliTaskProvider
): ListViewStrategy {
  const listView = new ListView(cliTaskProvider);
  return {
    getChildren: listView.getChildren.bind(listView),
    getParent: listView.getParent.bind(listView),
  };
}

class ListView {
  constructor(private readonly cliTaskProvider: CliTaskProvider) {}
  async getParent(element: NxListViewItem) {
    if (element instanceof NxProjectTreeItem) {
      // is already root level
      return null;
    }

    const { nxProject, nxTarget } = element;
    const projectDef = (await this.cliTaskProvider.getProjects())[
      nxProject.project
    ];

    if (!nxTarget.configuration) {
      return this.createProjectTreeItem([nxProject.project, projectDef]);
    }

    if (!projectDef.targets || !projectDef.targets[nxTarget.name]) {
      getOutputChannel().appendLine(
        `Could not find target '${nxTarget.name}' in project '${nxProject.project}', even though it should exist`
      );
      return null;
    }

    return this.createTargetTreeItem(nxProject, [
      nxTarget.name,
      projectDef.targets[nxTarget.name],
    ]);
  }

  async getChildren(element?: NxListViewItem) {
    if (!element) {
      // should return root elements if no element was passed
      return this.createProjects();
    }
    if (element instanceof NxProjectTreeItem) {
      return this.createTargetsFormProject(element);
    }
    return this.createConfigurationsFormTarget(element);
  }

  private async createProjects() {
    const projectDefs = await this.cliTaskProvider.getProjects();
    return Object.entries(projectDefs).map((project) =>
      this.createProjectTreeItem(project)
    );
  }

  private createProjectTreeItem([projectName, { root, name, targets }]: [
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

    const item = new NxProjectTreeItem(
      nxProject,
      projectName,
      hasChildren
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None
    );

    item.resourceUri = Uri.file(
      join(this.cliTaskProvider.getWorkspacePath(), nxProject.root ?? '')
    );

    item.contextValue = 'project';
    return item;
  }

  private async createTargetsFormProject(parent: NxProjectTreeItem) {
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

  private createTargetTreeItem(
    nxProject: NxProject,
    [targetName, { configurations }]: [
      targetName: string,
      targetDefinition: TargetConfiguration
    ]
  ) {
    const hasChildren = !!configurations;
    const item = new NxTargetTreeItem(
      nxProject,
      { name: targetName },
      targetName,
      hasChildren
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None
    );
    item.contextValue = 'task';
    return item;
  }

  private async createConfigurationsFormTarget(parent: NxTargetTreeItem) {
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
      Object.keys(configurations).map((configuration) => {
        const item = new NxTargetTreeItem(
          nxProject,
          { name: nxTarget.name, configuration },
          configuration,
          TreeItemCollapsibleState.None
        );
        item.contextValue = 'task';
        return item;
      })
    );
  }
}
