import { TargetConfiguration } from 'nx/src/devkit-exports';
import { QuickPickItem } from 'vscode';

export class CliTaskQuickPickItem implements QuickPickItem {
  constructor(
    readonly projectName: string,
    readonly projectRoot: string,
    readonly targetDef: TargetConfiguration,
    readonly command: string,
    readonly label: string
  ) {}
}
