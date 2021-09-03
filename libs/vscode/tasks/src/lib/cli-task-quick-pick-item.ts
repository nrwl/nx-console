import { TargetConfiguration } from '@nrwl/devkit';
import { QuickPickItem } from 'vscode';

export class CliTaskQuickPickItem implements QuickPickItem {
  constructor(
    readonly projectName: string,
    readonly targetDef: TargetConfiguration,
    readonly command: string,
    readonly label: string
  ) {}
}
