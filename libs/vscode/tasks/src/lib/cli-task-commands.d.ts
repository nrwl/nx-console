import { ExtensionContext, Uri } from 'vscode';
import { WorkspaceJsonConfiguration } from '@nrwl/devkit';
import { CliTaskProvider } from './cli-task-provider';
import { CliTaskQuickPickItem } from './cli-task-quick-pick-item';
export declare function registerCliTaskCommands(context: ExtensionContext, n: CliTaskProvider): void;
export declare function getCliProjectFromUri(uri: Uri): Promise<string | undefined>;
export declare function selectCliProject(command: string, json: WorkspaceJsonConfiguration): Promise<CliTaskQuickPickItem | undefined>;
