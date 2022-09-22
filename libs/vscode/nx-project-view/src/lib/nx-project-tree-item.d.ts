import { TreeItem, TreeItemCollapsibleState } from 'vscode';
export declare class NxProjectTreeItem extends TreeItem {
    nxProject: NxProject;
    constructor(nxProject: NxProject, treeItemLabel: string, collapsibleState?: TreeItemCollapsibleState | undefined);
}
export interface NxProject {
    project: string;
    root: string;
    target?: {
        name: string;
        configuration?: string;
    };
}
