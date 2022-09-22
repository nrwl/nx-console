import { ShellExecution } from 'vscode';
export interface ShellConfig {
    cwd: string;
    displayCommand: string;
}
export declare function getShellExecutionForConfig(config: ShellConfig): ShellExecution;
