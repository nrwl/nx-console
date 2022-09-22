import { GeneratorType } from '@nx-console/shared/schema';
import { TreeItem, TreeView, Uri } from 'vscode';
export declare const commandList: () => Promise<string[]>;
export declare class RunTargetTreeItem extends TreeItem {
    readonly configurationFilePath: string;
    readonly route: string;
    readonly extensionPath: string;
    readonly generatorType?: GeneratorType | undefined;
    readonly generator?: string | undefined;
    revealWorkspaceRoute(currentWorkspace: TreeView<RunTargetTreeItem>): void;
    command: {
        title: string;
        command: string;
        tooltip: string;
        arguments: any;
    };
    iconPath: {
        light: Uri;
        dark: Uri;
    } | undefined;
    label: string;
    constructor(configurationFilePath: string, route: string, extensionPath: string, generatorType?: GeneratorType | undefined, generator?: string | undefined);
    static getIconUriForRoute(extensionPath: string): {
        light: Uri;
        dark: Uri;
    } | undefined;
}
