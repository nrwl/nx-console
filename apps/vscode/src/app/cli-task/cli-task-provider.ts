import { join } from 'path';
import {
  ProviderResult,
  Task,
  TaskExecution,
  TaskProvider,
  tasks
} from 'vscode';

import { getTelemetry } from '../telemetry';
import { verifyWorkspace } from '../verify-workspace/verify-workspace';
import { verifyNodeModules } from '../verify-workspace/verify-node-modules';
import { CliTask } from './cli-task';
import {
  CliTaskDefinition,
  NamedProject,
  ProjectDef,
  Projects,
  WorkspaceJson
} from './cli-task-definition';

export let cliTaskProvider: CliTaskProvider;

export class CliTaskProvider implements TaskProvider {
  private currentDryRun?: TaskExecution;
  private deferredDryRun?: CliTaskDefinition;

  constructor(private workspaceJsonPath: string) {
    cliTaskProvider = this;

    tasks.onDidEndTaskProcess(() => {
      this.currentDryRun = undefined;
      if (this.deferredDryRun) {
        this.executeTask(this.deferredDryRun);
        this.deferredDryRun = undefined;
      }
    });
  }

  getWorkspacePath() {
    return join(this.workspaceJsonPath, '..');
  }

  getWorkspaceJsonPath() {
    return this.workspaceJsonPath;
  }

  setWorkspaceJsonPath(workspaceJsonPath: string) {
    this.workspaceJsonPath = workspaceJsonPath;
  }

  provideTasks(): ProviderResult<Task[]> {
    return null;
  }

  resolveTask(task: Task): Task | undefined {
    if (
      this.workspaceJsonPath &&
      task.definition.command &&
      task.definition.project
    ) {
      const cliTask = this.createTask({
        command: task.definition.command,
        positional: task.definition.project,
        flags: Array.isArray(task.definition.flags) ? task.definition.flags : []
      });
      // resolveTask requires that the same definition object be used.
      cliTask.definition = task.definition;
      return cliTask;
    }
  }

  createTask(definition: CliTaskDefinition) {
    return CliTask.create(definition, this.workspaceJsonPath);
  }

  executeTask(definition: CliTaskDefinition) {
    const { validNodeModules: hasNodeModules } = verifyNodeModules(
      this.getWorkspacePath()
    );
    if (!hasNodeModules) {
      return;
    }

    const isDryRun = definition.flags.includes('--dry-run');
    if (isDryRun && this.currentDryRun) {
      this.deferredDryRun = definition;
      return;
    }

    const task = this.createTask(definition);

    const telemetry = getTelemetry();
    telemetry.featureUsed(definition.command);

    return tasks.executeTask(task).then(execution => {
      if (isDryRun) {
        this.currentDryRun = execution;
      }
    });
  }

  getProjects(json?: WorkspaceJson): Projects {
    if (json) {
      return json.projects;
    } else {
      const result = verifyWorkspace(this.getWorkspacePath());
      if (!result.validWorkspaceJson || !result.json) {
        return {};
      } else {
        return result.json.projects;
      }
    }
  }

  getProjectNames(): string[] {
    return Object.keys(this.getProjects() || {});
  }

  getProjectEntries(json?: WorkspaceJson): [string, ProjectDef][] {
    return Object.entries(this.getProjects(json) || {}) as [
      string,
      ProjectDef
    ][];
  }

  projectForPath(selectedPath: string): NamedProject | null {
    if (!this.workspaceJsonPath) return null;

    const entry = this.getProjectEntries().find(([_, def]) =>
      selectedPath.startsWith(join(this.getWorkspacePath(), def.root))
    );

    return entry ? { name: entry[0], ...entry[1] } : null;
  }
}
