import type {
  ProjectConfiguration,
  TargetConfiguration,
} from 'nx/src/devkit-exports';
import { getNxWorkspaceProjects } from '@nx-console/vscode/nx-workspace';
import { getOutputChannel } from '@nx-console/vscode/output-channels';
import { join } from 'node:path';
import { TreeItemCollapsibleState } from 'vscode';
import { getWorkspacePath } from '@nx-console/vscode/utils';

export interface ProjectViewStrategy<T> {
  getChildren(element?: T): Promise<T[] | undefined>;
}

interface BaseViewItem<Context extends string> {
  id: string;
  contextValue: Context;
  label: string;
  collapsible: TreeItemCollapsibleState;
}

export interface FolderViewItem extends BaseViewItem<'folder'> {
  path: string;
  resource: string;
}

export interface ProjectViewItem extends BaseViewItem<'project'> {
  nxProject: NxProject;
  resource: string;
}

export interface TargetViewItem extends BaseViewItem<'target'> {
  nxProject: NxProject;
  nxTarget: NxTarget;
}

export interface TargetGroupViewItem extends BaseViewItem<'targetGroup'> {
  nxProject: NxProject;
  nxTargets: NxTarget[];
  targetGroupName: string;
}

export interface NxProject {
  project: string;
  root: string;
}

export interface NxTarget {
  name: string;
  configuration?: string;
}

export abstract class BaseView {
  createProjectViewItem(
    [projectName, { root, name, targets }]: [
      projectName: string,
      projectDefinition: ProjectConfiguration
    ],
    collapsible = TreeItemCollapsibleState.Collapsed
  ): ProjectViewItem {
    const hasChildren =
      !targets ||
      Object.keys(targets).length !== 0 ||
      Object.getPrototypeOf(targets) !== Object.prototype;

    const nxProject = { project: name ?? projectName, root };

    if (root === undefined) {
      getOutputChannel().appendLine(
        `Project ${nxProject.project} has no root. This could be because of an error loading the workspace configuration.`
      );
    }

    return {
      id: projectName,
      contextValue: 'project',
      nxProject,
      label: projectName,
      resource: join(getWorkspacePath(), nxProject.root ?? ''),
      collapsible: hasChildren ? collapsible : TreeItemCollapsibleState.None,
    };
  }

  async createTargetsAndGroupsFromProject(
    parent: ProjectViewItem
  ): Promise<(TargetViewItem | TargetGroupViewItem)[] | undefined> {
    const { nxProject } = parent;

    const projectDef = (await getNxWorkspaceProjects())[nxProject.project];
    if (!projectDef) {
      return;
    }

    const { targets } = projectDef;
    if (!targets) {
      return;
    }

    if (!projectDef.metadata?.targetGroups) {
      return Object.entries(targets).map((target) =>
        this.createTargetTreeItem(nxProject, target)
      );
    }

    const targetGroupMap = new Map<string, string[]>();
    const nonGroupedTargets: Set<string> = new Set(Object.keys(targets));

    for (const [targetGroupName, targets] of Object.entries(
      projectDef.metadata.targetGroups
    )) {
      if (!targetGroupMap.has(targetGroupName)) {
        targetGroupMap.set(targetGroupName, []);
      }
      for (const target of targets) {
        targetGroupMap.get(targetGroupName)?.push(target);
        nonGroupedTargets.delete(target);
      }
    }

    return [
      ...Array.from(targetGroupMap.entries()).map(
        ([targetGroupName, targets]) =>
          this.createTargetGroupTreeItem(nxProject, targetGroupName, targets)
      ),
      ...Array.from(nonGroupedTargets).map((targetName) =>
        this.createTargetTreeItem(nxProject, [targetName, targets[targetName]])
      ),
    ];
  }

  createTargetTreeItem(
    nxProject: NxProject,
    [targetName, { configurations }]: [
      targetName: string,
      targetDefinition: TargetConfiguration
    ]
  ): TargetViewItem {
    const hasChildren =
      configurations && Object.keys(configurations).length > 0;
    return {
      id: `${nxProject.project}:${targetName}`,
      contextValue: 'target',
      nxProject,
      nxTarget: { name: targetName },
      label: targetName,
      collapsible: hasChildren
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None,
    };
  }

  createTargetGroupTreeItem(
    nxProject: NxProject,
    targetGroupName: string,
    targetNames: string[]
  ): TargetGroupViewItem {
    return {
      id: `${nxProject.project}:${targetGroupName}`,
      contextValue: 'targetGroup',
      nxProject,
      nxTargets: targetNames.map((name) => ({ name })),
      targetGroupName,
      label: targetGroupName,
      collapsible: TreeItemCollapsibleState.Collapsed,
    };
  }

  async createConfigurationsFromTarget(
    parent: TargetViewItem
  ): Promise<TargetViewItem[] | undefined> {
    const { nxProject, nxTarget } = parent;

    const projectDef = (await getNxWorkspaceProjects())[nxProject.project];
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

    return Object.keys(configurations).map((configuration) => ({
      id: `${nxProject.project}:${nxTarget.name}:${configuration}`,
      contextValue: 'target',
      nxProject,
      nxTarget: { name: nxTarget.name, configuration },
      label: configuration,
      collapsible: TreeItemCollapsibleState.None,
    }));
  }

  async createTargetsFromTargetGroup(
    parent: TargetGroupViewItem
  ): Promise<TargetViewItem[] | undefined> {
    const { nxProject } = parent;

    const projectDef = (await getNxWorkspaceProjects())[nxProject.project];
    if (!projectDef) {
      return;
    }

    const { targets } = projectDef;
    if (!targets) {
      return;
    }

    return parent.nxTargets.map((target) =>
      this.createTargetTreeItem(nxProject, [target.name, targets[target.name]])
    );
  }
}
