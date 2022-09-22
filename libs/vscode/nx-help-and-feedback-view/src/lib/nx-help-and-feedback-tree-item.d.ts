import { ThemeIcon, TreeItem, Uri } from 'vscode';
export declare class NxHelpAndFeedbackTreeItem extends TreeItem {
    private readonly title;
    private readonly link;
    readonly icon: string | Uri | {
        light: string | Uri;
        dark: string | Uri;
    } | ThemeIcon;
    command: {
        title: string;
        command: string;
        arguments: string[];
    };
    constructor(title: string, link: string, icon: string | Uri | {
        light: string | Uri;
        dark: string | Uri;
    } | ThemeIcon);
}
