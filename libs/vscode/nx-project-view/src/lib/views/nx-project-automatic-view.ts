import { getNxWorkspaceProjects } from '@nx-console/vscode/nx-workspace';

import { ProjectViewStrategy } from './nx-project-base-view';
import { createListViewStrategy, ListViewItem } from './nx-project-list-view';
import { createTreeViewStrategy, TreeViewItem } from './nx-project-tree-view';
export type AutomaticViewItem = ListViewItem | TreeViewItem;
export type AutomaticViewStrategy = ProjectViewStrategy<AutomaticViewItem>;

export function createAutomaticViewStrategy(): AutomaticViewStrategy {
  const listViewStrategy = createListViewStrategy();
  const treeViewStrategy = createTreeViewStrategy();

  return {
    getChildren: async (element?: AutomaticViewItem) => {
      const projectCount = Object.keys(await getNxWorkspaceProjects()).length;
      if (projectCount > 10) {
        return treeViewStrategy.getChildren(element as TreeViewItem);
      }
      return listViewStrategy.getChildren(element as ListViewItem);
    },
  };
}
