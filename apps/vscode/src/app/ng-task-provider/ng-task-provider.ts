import { TaskProvider, ProviderResult, Task } from 'vscode';
import { readJsonFile, FileUtils } from '@angular-console/server';
import { getTaskId } from '../pseudo-terminal.factory';
import { NgTaskDefinition, ArchitectDef, AngularJson } from './interfaces';
import { NgTask } from './ng-task';

export class NgTaskProvider implements TaskProvider {
  private workspacePath?: string;
  private ngTasksPromise?: Task[];

  constructor(private readonly fileUtils: FileUtils) {}

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
            getTaskDefs({ architectName, projectName, type }, architectDef)
        );
      })
      .map(taskDef =>
        NgTask.create(taskDef, this.workspacePath as string, this.fileUtils)
      );

    return this.ngTasksPromise;
  }

  resolveTask(task: Task): ProviderResult<Task> {
    if (!this.workspacePath) {
      return null;
    }

    // Make sure that this looks like a NgTaskDefinition.
    if (task.definition.architectName && task.definition.projectName) {
      return NgTask.create(
        {
          ...(task.definition as NgTaskDefinition),
          type: getTaskId()
        },
        this.workspacePath as string,
        this.fileUtils
      );
    }

    return undefined;
  }

  getProjectEntries() {
    if (!this.workspacePath) {
      return [];
    }

    const { projects } = readJsonFile('angular.json', this.workspacePath)
      .json as AngularJson;

    return Object.entries(projects || {});
  }
}

function getTaskDefs(
  ngTaskDefinition: NgTaskDefinition,
  architectDef: ArchitectDef
) {
  return [
    ngTaskDefinition,
    ...Object.keys(architectDef.configurations || {}).map(
      (configuration): NgTaskDefinition => ({
        ...ngTaskDefinition,
        configuration
      })
    )
  ];
}
