import { Task } from 'vscode';
import { CliTaskDefinition } from './cli-task-definition';
export declare class CliTask extends Task {
    static create(definition: CliTaskDefinition, workspacePath: string): Promise<CliTask>;
}
