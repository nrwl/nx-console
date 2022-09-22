import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { AbstractTreeProvider } from '@nx-console/vscode/utils';
import { ExtensionContext } from 'vscode';
import { NxProject, NxProjectTreeItem } from './nx-project-tree-item';
/**
 * Provides data for the "Projects" tree view
 */
export declare class NxProjectTreeProvider extends AbstractTreeProvider<NxProjectTreeItem> {
    private readonly cliTaskProvider;
    constructor(context: ExtensionContext, cliTaskProvider: CliTaskProvider);
    getParent(element: NxProjectTreeItem): Promise<NxProjectTreeItem | null | undefined>;
    createNxProjectTreeItem(nxProject: NxProject, treeItemLabel: string, hasChildren?: boolean): Promise<NxProjectTreeItem>;
    getChildren(parent?: NxProjectTreeItem): Promise<NxProjectTreeItem[] | undefined>;
    private runTask;
    private revealInExplorer;
    private editWorkspaceJson;
    private refreshNxProjectsTree;
}
