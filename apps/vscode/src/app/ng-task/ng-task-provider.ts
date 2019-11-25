import { join } from 'path';
import {
  ProviderResult,
  Task,
  TaskExecution,
  TaskProvider,
  tasks
} from 'vscode';

import { getTelemetry } from '../telemetry';
import { NgTask } from './ng-task';
import {
  AngularJson,
  NamedProject,
  NgTaskDefinition,
  ProjectDef,
  Projects
} from './ng-task-definition';
import { verifyNodeModules } from '../verify-workspace/verify-node-modules';
import { verifyAngularJson } from '../verify-workspace/verify-angular-json';

export let ngTaskProvider: NgTaskProvider;

export class NgTaskProvider implements TaskProvider {
  private currentDryRun?: TaskExecution;
  private deferredDryRun?: NgTaskDefinition;

  constructor(private workspacePath: string) {
    ngTaskProvider = this;

    tasks.onDidEndTaskProcess(e => {
      if (e.execution === this.currentDryRun) {
        this.currentDryRun = undefined;
      }
      if (this.deferredDryRun) {
        this.executeTask(this.deferredDryRun);
        this.deferredDryRun = undefined;
      }
    });
  }

  getWorkspacePath() {
    return this.workspacePath;
  }

  setWorkspacePath(workspacePath: string) {
    this.workspacePath = workspacePath;
  }

  provideTasks(): ProviderResult<Task[]> {
    return null;
  }

  resolveTask(task: Task): Task | undefined {
    if (
      this.workspacePath &&
      task.definition.command &&
      task.definition.project
    ) {
      const ngTask = this.createTask({
        command: task.definition.command,
        positional: task.definition.project,
        flags: Array.isArray(task.definition.flags) ? task.definition.flags : []
      });
      // resolveTask requires that the same definition object be used.
      ngTask.definition = task.definition;
      return ngTask;
    }
  }

  createTask(definition: NgTaskDefinition) {
    return NgTask.create(definition, this.workspacePath || '');
  }

  executeTask(definition: NgTaskDefinition) {
    const { validNodeModules: hasNodeModules } = verifyNodeModules(
      this.workspacePath
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

  getProjects(json?: AngularJson): Projects {
    if (json) {
      return json.projects;
    } else {
      const result = verifyAngularJson(this.workspacePath);
      if (!result.validAngularJson || !result.json) {
        return {};
      } else {
        return result.json.projects;
      }
    }
  }

  getProjectNames(): string[] {
    return Object.keys(this.getProjects() || {});
  }

  getProjectEntries(json?: AngularJson): [string, ProjectDef][] {
    return Object.entries(this.getProjects(json) || {}) as [
      string,
      ProjectDef
    ][];
  }

  projectForPath(selectedPath: string): NamedProject | null {
    if (!this.workspacePath) return null;

    console.log(selectedPath);
    const entry = this.getProjectEntries().find(([_, def]) =>
      selectedPath.startsWith(join(this.workspacePath, def.root))
    );

    return entry ? { name: entry[0], ...entry[1] } : null;
  }
}
