import { ProjectConfiguration, TargetConfiguration } from '@nrwl/devkit';
import {
  getNxWorkspace,
  getNxWorkspaceProjects,
} from '@nx-console/vscode/nx-workspace';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { getOutputChannel, getWorkspacePath } from '@nx-console/vscode/utils';
import { join } from 'node:path';

export interface ProjectViewStrategy<T> {
  getChildren(element?: T): Promise<T[] | undefined>;
}

export type ViewDataProvider = Pick<
  CliTaskProvider,
  'getWorkspacePath' | 'getProjects'
>;

interface BaseViewItem<Context extends string> {
  contextValue: Context;
  label: string;
  collapsible: Collapsible;
}

export interface FolderViewItem extends BaseViewItem<'folder'> {
  path: string;
  resource: string;
}

export interface ProjectViewItem extends BaseViewItem<'project'> {
  nxProject: NxProject;
  resource: string;
}

export interface TargetViewItem extends BaseViewItem<'task'> {
  nxProject: NxProject;
  nxTarget: NxTarget;
}

export type Collapsible = 'None' | 'Collapsed' | 'Expanded';

export interface NxProject {
  project: string;
  root: string;
}

export interface NxTarget {
  name: string;
  configuration?: string;
}

export abstract class BaseView {
  createProjectViewItem([projectName, { root, name, targets }]: [
    projectName: string,
    projectDefinition: ProjectConfiguration
  ]): ProjectViewItem {
    const hasChildren = !!targets;
    const nxProject = { project: name ?? projectName, root };

    if (root === undefined) {
      getOutputChannel().appendLine(
        `Project ${nxProject.project} has no root. This could be because of an error loading the workspace configuration.`
      );
    }

    return {
      contextValue: 'project',
      nxProject,
      label: projectName,
      resource: join(getWorkspacePath(), nxProject.root ?? ''),
      collapsible: hasChildren ? 'Collapsed' : 'None',
    };
  }

  async createTargetsFromProject(parent: ProjectViewItem) {
    const { nxProject } = parent;

    const projectDef = (await getNxWorkspaceProjects())[nxProject.project];
    if (!projectDef) {
      return;
    }

    const { targets } = projectDef;
    if (!targets) {
      return;
    }

    return Object.entries(targets).map((target) =>
      this.createTargetTreeItem(nxProject, target)
    );
  }

  createTargetTreeItem(
    nxProject: NxProject,
    [targetName, { configurations }]: [
      targetName: string,
      targetDefinition: TargetConfiguration
    ]
  ): TargetViewItem {
    const hasChildren = !!configurations;
    return {
      contextValue: 'task',
      nxProject,
      nxTarget: { name: targetName },
      label: targetName,
      collapsible: hasChildren ? 'Collapsed' : 'None',
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
      contextValue: 'task',
      nxProject,
      nxTarget: { name: nxTarget.name, configuration },
      label: configuration,
      collapsible: 'None',
    }));
  }
}
