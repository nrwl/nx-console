import { TreeDataProvider } from 'vscode';
import { NxListViewItem } from './nx-project-tree-item';
export type ProjectViewStrategy<T> = Required<
  Pick<TreeDataProvider<T>, 'getChildren' | 'getParent'>
>;

export type ListViewStrategy = ProjectViewStrategy<NxListViewItem>;
