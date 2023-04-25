import { WORKSPACE_GENERATOR_NAME_REGEX } from '@nx-console/shared/schema';
import { getNxWorkspacePath } from '@nx-console/vscode/nx-workspace';
import {
  ProviderResult,
  Task,
  TaskExecution,
  TaskProvider,
  tasks,
} from 'vscode';
import { CliTask } from './cli-task';
import { CliTaskDefinition } from './cli-task-definition';
import { NxTask } from './nx-task';

export class CliTaskProvider implements TaskProvider {
  private currentDryRun?: TaskExecution;
  private deferredDryRun?: CliTaskDefinition;

  private static _instance: CliTaskProvider;
  static get instance(): CliTaskProvider {
    if (!this._instance) {
      this._instance = new CliTaskProvider();
    }
    return this._instance;
  }

  constructor() {
    tasks.onDidEndTaskProcess(() => {
      this.currentDryRun = undefined;
      if (this.deferredDryRun) {
        this.executeTask(this.deferredDryRun);
        this.deferredDryRun = undefined;
      }
    });
  }

  provideTasks(): ProviderResult<Task[]> {
    return null;
  }

  async resolveTask(task: Task): Promise<Task | undefined> {
    if (
      (await getNxWorkspacePath()) &&
      task.definition.command &&
      task.definition.project
    ) {
      const cliTask = await this.createTask({
        command: task.definition.command,
        positional: task.definition.project,
        flags: Array.isArray(task.definition.flags)
          ? task.definition.flags
          : [],
      });
      // resolveTask requires that the same definition object be used.
      cliTask.definition = task.definition;
      return cliTask;
    }
  }

  async createTask(definition: CliTaskDefinition) {
    return CliTask.create(definition);
  }

  async executeTask(definition: CliTaskDefinition) {
    const isDryRun = definition.flags.includes('--dry-run');
    if (isDryRun && this.currentDryRun) {
      this.deferredDryRun = definition;
      return;
    }

    let task;
    const positionals = definition.positional.match(
      WORKSPACE_GENERATOR_NAME_REGEX
    );
    if (
      definition.command === 'generate' &&
      positionals &&
      positionals.length > 2
    ) {
      task = await NxTask.create({
        command: `workspace-${positionals[1]}`,
        positional: positionals[2],
        flags: definition.flags,
      });
    } else {
      task = await this.createTask(definition);
    }

    return tasks.executeTask(task).then((execution) => {
      if (isDryRun) {
        this.currentDryRun = execution;
      }
    });
  }
}
