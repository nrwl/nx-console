import { Task } from 'vscode';
export interface NxTaskDefinition {
    positional?: string;
    command: string;
    flags: Array<string>;
}
export declare class NxTask extends Task {
    static create(definition: NxTaskDefinition, workspacePath: string): NxTask;
}
