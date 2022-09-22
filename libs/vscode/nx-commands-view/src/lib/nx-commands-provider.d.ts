import { AbstractTreeProvider } from '@nx-console/vscode/utils';
import { NxCommandsTreeItem } from './nx-commands-tree-item';
import { ExtensionContext } from 'vscode';
export declare class NxCommandsTreeProvider extends AbstractTreeProvider<NxCommandsTreeItem> {
    private readonly context;
    constructor(context: ExtensionContext);
    getParent(_: NxCommandsTreeItem): null;
    getChildren(): NxCommandsTreeItem[];
}
