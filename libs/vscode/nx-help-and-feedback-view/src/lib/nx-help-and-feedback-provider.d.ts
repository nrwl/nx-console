import { AbstractTreeProvider } from '@nx-console/vscode/utils';
import { ExtensionContext, ProviderResult } from 'vscode';
import { NxHelpAndFeedbackTreeItem } from './nx-help-and-feedback-tree-item';
export declare class NxHelpAndFeedbackProvider extends AbstractTreeProvider<NxHelpAndFeedbackTreeItem> {
    private readonly context;
    constructor(context: ExtensionContext);
    getParent(_: NxHelpAndFeedbackTreeItem): null;
    getChildren(): ProviderResult<NxHelpAndFeedbackTreeItem[]>;
}
