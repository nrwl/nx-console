import { FileUtils, readJsonFile } from '@angular-console/server';
import { ProviderResult, Task, TaskProvider } from 'vscode';

import { NgTask } from './ng-task';
import {
  AngularJson,
  NgTaskDefinition,
  ProjectDef,
  Projects
} from './ng-task-definition';

export class NgTaskProvider implements TaskProvider {
  private workspacePath?: string;
  private ngTasksPromise?: Task[];

  constructor(private readonly fileUtils: FileUtils) {}

  getWorkspacePath() {
    return this.workspacePath;
  }

  setWorkspacePath(path: string) {
    this.workspacePath = path;
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

          return Object.keys(project.architect).map(architectName => ({
            architectName,
            projectName,
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
      return this.createTask(task.definition as NgTaskDefinition);
    }
  }

  createTask(definition: NgTaskDefinition) {
    return NgTask.create(definition, this.workspacePath || '', this.fileUtils);
  }

  getProjects(): Projects {
    if (!this.workspacePath) {
      return {};
    }

    const { projects } = readJsonFile('angular.json', this.workspacePath)
      .json as AngularJson;

    return projects;
  }

  getProjectNames(): string[] {
    return Object.keys(this.getProjects() || {});
  }

  getProjectEntries(): [string, ProjectDef][] {
    return Object.entries(this.getProjects() || {}) as [string, ProjectDef][];
  }
}
