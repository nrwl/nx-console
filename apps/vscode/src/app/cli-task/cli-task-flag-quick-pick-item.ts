import { Option } from '@angular-console/schema';
import { QuickPickItem } from 'vscode';

export class CliTaskFlagQuickPickItem implements QuickPickItem {
  constructor(
    readonly flagName: string,
    readonly detail: string,
    readonly option: Option,
    readonly label: string
  ) {}
}
