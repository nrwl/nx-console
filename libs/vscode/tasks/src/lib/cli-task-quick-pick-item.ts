import { ArchitectDef } from './cli-task-definition';
import { QuickPickItem } from 'vscode';

export class CliTaskQuickPickItem implements QuickPickItem {
  constructor(
    readonly projectName: string,
    readonly architectDef: ArchitectDef,
    readonly command: string,
    readonly label: string
  ) {}
}
