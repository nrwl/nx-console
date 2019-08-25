import { TaskProvider, ProviderResult, Task } from 'vscode';
import { readJsonFile, FileUtils } from '@angular-console/server';
import { getTaskId } from '../pseudo-terminal.factory';
import {
  NgTaskDefinition,
  AngularJson,
  getArchitectTaskDefintions,
  Projects,
  ProjectDef
} from './ng-task-definition';
import { NgTask } from './ng-task';

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
      .flatMap(([projectName, project]) => {
        if (!project.architect) {
          return [];
        }

        const type = getTaskId();
        return Object.entries(project.architect).flatMap(
          ([architectName, architectDef]) =>
            getArchitectTaskDefintions(
              { architectName, projectName, type },
              architectDef
            )
        );
      })
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
      return NgTask.create(
        {
          ...(task.definition as NgTaskDefinition),
          type: getTaskId()
        },
        this.workspacePath,
        this.fileUtils
      );
    }
  }

  getProjects(): Projects {
    if (!this.workspacePath) {
      return {};
    }

    const { projects } = readJsonFile('angular.json', this.workspacePath)
      .json as AngularJson;

    return projects;
  }

  getProjectEntries(): [string, ProjectDef][] {
    return Object.entries(this.getProjects() || {});
  }
}
