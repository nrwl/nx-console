import { ArchitectDef, TargetDef } from './cli-task-definition';
import { QuickPickItem } from 'vscode';

export class CliTaskQuickPickItem implements QuickPickItem {
  constructor(
    readonly projectName: string,
    readonly targetDef: ArchitectDef | TargetDef,
    readonly command: string,
    readonly label: string
  ) {}
}
