import { ArchitectDef } from './ng-task-definition';
import { QuickPickItem } from 'vscode';

export class NgTaskQuickPickItem implements QuickPickItem {
  constructor(
    readonly projectName: string,
    readonly architectDef: ArchitectDef,
    readonly command: string,
    readonly label: string
  ) {}
}
