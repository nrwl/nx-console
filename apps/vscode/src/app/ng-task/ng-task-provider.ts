import { FileUtils, readJsonFile } from '@angular-console/server';
import {
  ProviderResult,
  Task,
  TaskProvider,
  window,
  tasks,
  TaskExecution
} from 'vscode';
import * as path from 'path';

import { NgTask } from './ng-task';
import {
  AngularJson,
  NgTaskDefinition,
  ProjectDef,
  NamedProject,
  Projects
} from './ng-task-definition';
import { getTelemetry } from '../telemetry';

export class NgTaskProvider implements TaskProvider {
  private workspacePath?: string;
  private ngTasksPromise?: Task[];
  private currentDryRun?: TaskExecution;
  private deferredDryRun?: NgTaskDefinition;

  constructor(private readonly fileUtils: FileUtils) {
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
    this.ngTasksPromise = undefined;
  }

  provideTasks(): ProviderResult<Task[]> {
    if (!this.workspacePath) {
      return null;
    }

    if (this.ngTasksPromise) {
      return this.ngTasksPromise;
    }

    this.ngTasksPromise = this.getProjectEntries()
      .flatMap(
        ([projectName, project]): NgTaskDefinition[] => {
          if (!project.architect) {
            return [];
          }

          return Object.keys(project.architect).map(command => ({
            command,
            positional: projectName,
            flags: [],
            type: 'shell'
          }));
        }
      )
      .map(taskDef =>
        NgTask.create(taskDef, this.workspacePath as string, this.fileUtils)
      );

    return this.ngTasksPromise;
  }

  resolveTask(task: Task): Task | undefined {
    // Make sure that this looks like a NgTaskDefinition.
    if (
      this.workspacePath &&
      task.definition.architectName &&
      task.definition.projectName
    ) {
      return this.createTask((task.definition as unknown) as NgTaskDefinition);
    }
  }

  createTask(definition: NgTaskDefinition) {
    return NgTask.create(definition, this.workspacePath || '', this.fileUtils);
  }

  executeTask(definition: NgTaskDefinition) {
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

  getProjects(): Projects {
    if (!this.workspacePath) {
      return {};
    }

    try {
      const { projects } = readJsonFile('angular.json', this.workspacePath)
        .json as AngularJson;

      return projects;
    } catch {
      window.showErrorMessage(
        'Your angular.json file is invalid (see debug console)'
      );
      return {};
    }
  }

  getProjectNames(): string[] {
    return Object.keys(this.getProjects() || {});
  }

  getProjectEntries(): [string, ProjectDef][] {
    return Object.entries(this.getProjects() || {}) as [string, ProjectDef][];
  }

  projectForPath(selectedPath: string): NamedProject | null {
    if (!this.workspacePath) return null;

    const entry = this.getProjectEntries().find(([_, def]) =>
      selectedPath.startsWith(path.join(this.workspacePath!, def.root))
    );

    return entry ? { name: entry[0], ...entry[1] } : null;
  }
}
