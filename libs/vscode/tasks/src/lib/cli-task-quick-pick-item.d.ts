import { TargetConfiguration } from '@nrwl/devkit';
import { QuickPickItem } from 'vscode';
export declare class CliTaskQuickPickItem implements QuickPickItem {
    readonly projectName: string;
    readonly projectRoot: string;
    readonly targetDef: TargetConfiguration;
    readonly command: string;
    readonly label: string;
    constructor(projectName: string, projectRoot: string, targetDef: TargetConfiguration, command: string, label: string);
}
