import { TreeItem, Uri } from 'vscode';
export declare class NxCommandsTreeItem extends TreeItem {
    readonly affectedCommand: string;
    readonly extensionPath: string;
    command: {
        title: string;
        command: string;
        tooltip: string;
    };
    iconPath: {
        light: Uri;
        dark: Uri;
    };
    constructor(affectedCommand: string, extensionPath: string);
}
