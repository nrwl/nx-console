import { Option } from '@nx-console/shared/schema';
import { QuickPickItem } from 'vscode';
export declare class CliTaskFlagQuickPickItem implements QuickPickItem {
    readonly flagName: string;
    readonly detail: string;
    readonly option: Option;
    readonly label: string;
    constructor(flagName: string, detail: string, option: Option, label: string);
}
