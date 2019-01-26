import { settingsChange$, WorkspaceDefinition } from '@angular-console/server';
import { TreeDataProvider } from 'vscode';

import { Workspace } from '../tree-item/workspace';
import {
  WorkspaceRoute,
  WorkspaceRouteTitle
} from '../tree-item/workspace-route';
import { AbstractTreeProvider } from './abstract-tree-provider';

export class RecentWorkspacesTreeProvider extends AbstractTreeProvider<
  WorkspaceRoute | Workspace
> {
  static create(
    recent: WorkspaceDefinition[],
    extensionPath: string,
    showFavorites: boolean
  ): TreeDataProvider<WorkspaceRoute | Workspace> {
    return new RecentWorkspacesTreeProvider(
      recent,
      extensionPath,
      showFavorites
    );
  }

  workspaces: Array<Workspace> = [];

  private constructor(
    private recent: WorkspaceDefinition[],
    private readonly extensionPath: string,
    private readonly showFavorites: boolean
  ) {
    super();
    settingsChange$.subscribe(settings => {
      this.recent = settings.recent;

      this.refresh();
    });
  }

  getParent(element: Workspace | WorkspaceRoute) {
    if (!(element instanceof WorkspaceRoute)) {
      return null;
    }

    return this.workspaces.find(
      w => w.workspaceDefinition === element.workspaceDefinition
    );
  }

  getChildren(element?: Workspace) {
    const workspaceDefinition = element
      ? element.workspaceDefinition
      : undefined;

    if (workspaceDefinition) {
      return Promise.resolve(
        ['Projects', 'Generate', 'Tasks', 'Extensions'].map(
          route =>
            new WorkspaceRoute(
              workspaceDefinition,
              route as WorkspaceRouteTitle,
              this.extensionPath
            )
        )
      );
    } else {
      this.workspaces = this.recent
        .filter(d => Boolean(d.favorite) === this.showFavorites)
        .map(d => new Workspace(d, this.extensionPath));

      return Promise.resolve(this.workspaces);
    }
  }
}
