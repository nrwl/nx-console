import { WORKSPACE_GENERATOR_NAME_REGEX } from '@nx-console/shared/schema';
import {
  getNxWorkspace,
  getNxWorkspacePathFromNxls,
} from '@nx-console/vscode/nx-workspace';
import { Task, TaskExecution, TaskProvider, tasks, window } from 'vscode';
import { CliTask } from './cli-task';
import { CliTaskDefinition } from './cli-task-definition';
import { NxTask } from './nx-task';
import {
  getOutputChannel,
  logAndShowTaskCreationError,
} from '@nx-console/vscode/utils';

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

  async provideTasks(): Promise<Task[]> {
    const nxWorkspace = await getNxWorkspace();

    const projectTargetCombinations: [string, string][] = [];

    Object.entries(nxWorkspace?.workspace.projects ?? {}).forEach(
      ([projectName, project]) => {
        Object.keys(project.targets ?? {}).forEach((targetName) => {
          projectTargetCombinations.push([projectName, targetName]);
        });
      }
    );

    return CliTask.batchCreate(
      projectTargetCombinations.map(([projectName, targetName]) => {
        return {
          command: 'run',
          positional: `${projectName}:${targetName}`,
          flags: [],
        };
      }),
      nxWorkspace
    );
  }

  async resolveTask(task: Task): Promise<Task | undefined> {
    if ((await getNxWorkspacePathFromNxls()) && task.definition.command) {
      const cliTask = await CliTask.create({
        command: task.definition.command,
        positional: task.definition.positional,
        flags: Array.isArray(task.definition.flags)
          ? task.definition.flags
          : [],
      });
      // resolveTask requires that the same definition object be used.
      cliTask!.definition = task.definition;
      return cliTask;
    }
  }

  async executeTask(definition: CliTaskDefinition) {
    const isDryRun = definition.flags.includes('--dry-run');
    if (isDryRun && this.currentDryRun) {
      this.deferredDryRun = definition;
      return;
    }

    let task;
    const positionals = definition.positional?.match(
      WORKSPACE_GENERATOR_NAME_REGEX
    );
    try {
      if (
        definition.command === 'generate' &&
        positionals &&
        positionals.length > 2
      ) {
        task = await NxTask.create({
          command: `workspace-${positionals[1]}`,
          positional: positionals[2],
          flags: definition.flags,
          cwd: definition.cwd,
        });
      } else {
        task = await CliTask.create(definition);
      }
    } catch (e) {
      logAndShowTaskCreationError(e);
      return;
    }

    if (!task) {
      return;
    }
    return tasks.executeTask(task).then((execution) => {
      if (isDryRun) {
        this.currentDryRun = execution;
      }
    });
  }
}
