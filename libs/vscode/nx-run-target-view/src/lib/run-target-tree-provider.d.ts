import { AbstractTreeProvider } from '@nx-console/vscode/utils';
import { ExtensionContext, TreeItem } from 'vscode';
import { RunTargetTreeItem } from './run-target-tree-item';
export declare const LOCATE_YOUR_WORKSPACE: TreeItem;
export declare const CHANGE_WORKSPACE: TreeItem;
export declare class RunTargetTreeProvider extends AbstractTreeProvider<RunTargetTreeItem | TreeItem> {
    readonly context: ExtensionContext;
    private scanning;
    private extensionPath;
    /**
     * Provides data for the "Generate & Run Target" view
     */
    constructor(context: ExtensionContext);
    getParent(): null;
    endScan(): void;
    getChildren(): Promise<(TreeItem | RunTargetTreeItem)[]>;
    private refreshRunTargetTree;
}
