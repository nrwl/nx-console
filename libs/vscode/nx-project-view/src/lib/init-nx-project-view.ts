import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { ExtensionContext, window } from 'vscode';
import { NxProjectTreeProvider } from './nx-project-tree-provider';
import { listenForAndStoreCollapsibleChanges } from './tree-item-collapsible-store';

export function initNxProjectView(
  context: ExtensionContext,
  cliTaskProvider: CliTaskProvider
): NxProjectTreeProvider {
  const nxProjectsTreeProvider = new NxProjectTreeProvider(
    context,
    cliTaskProvider
  );
  const nxProjectTreeView = window.createTreeView('nxProjects', {
    treeDataProvider: nxProjectsTreeProvider,
    showCollapseAll: true,
  });

  context.subscriptions.push(nxProjectTreeView);

  listenForAndStoreCollapsibleChanges(nxProjectTreeView, context);

  return nxProjectsTreeProvider;
}
