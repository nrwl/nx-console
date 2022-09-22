import { WorkspaceJsonConfiguration } from '@nrwl/devkit';
import { WorkspaceProjects } from '@nx-console/shared/schema';
import { ProviderResult, Task, TaskProvider } from 'vscode';
import { CliTask } from './cli-task';
import { CliTaskDefinition } from './cli-task-definition';
export declare class CliTaskProvider implements TaskProvider {
    private currentDryRun?;
    private deferredDryRun?;
    constructor();
    getWorkspacePath(): string;
    /**
     *
     * @deprecated
     */
    getWorkspaceJsonPath(): string;
    provideTasks(): ProviderResult<Task[]>;
    resolveTask(task: Task): Promise<Task | undefined>;
    createTask(definition: CliTaskDefinition): Promise<CliTask>;
    executeTask(definition: CliTaskDefinition): Promise<void>;
    getProjects(json?: WorkspaceJsonConfiguration): Promise<WorkspaceProjects>;
    getProjectNames(): Promise<string[]>;
    getProjectEntries(json?: WorkspaceJsonConfiguration): Promise<[string, import("@nrwl/devkit").ProjectConfiguration][]>;
}
