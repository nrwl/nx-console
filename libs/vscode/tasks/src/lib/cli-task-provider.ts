import { WorkspaceJsonConfiguration } from '@nrwl/devkit';
import {
  WorkspaceProjects,
  WORKSPACE_GENERATOR_NAME_REGEX,
} from '@nx-console/schema';
import { getTelemetry } from '@nx-console/server';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { NxConversion } from '@nx-console/vscode/nx-conversion';
import { nxWorkspace } from '@nx-console/vscode/nx-workspace';
import { isAbsolute, join, relative } from 'path';
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

export let cliTaskProvider: CliTaskProvider;

export class CliTaskProvider implements TaskProvider {
  private currentDryRun?: TaskExecution;
  private deferredDryRun?: CliTaskDefinition;

  constructor() {
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
    return WorkspaceConfigurationStore.instance.get('nxWorkspacePath', '');
  }

  /**
   *
   * @deprecated
   */
  getWorkspaceJsonPath() {
    return WorkspaceConfigurationStore.instance.get('nxWorkspacePath', '');
  }

  provideTasks(): ProviderResult<Task[]> {
    return null;
  }

  async resolveTask(task: Task): Promise<Task | undefined> {
    if (
      this.getWorkspacePath() &&
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
    return CliTask.create(definition, this.getWorkspacePath());
  }

  async executeTask(definition: CliTaskDefinition) {
    NxConversion.instance.trackEvent(definition.command);
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
      task = NxTask.create(
        {
          command: `workspace-${positionals[1]}`,
          positional: positionals[2],
          flags: definition.flags,
        },
        cliTaskProvider.getWorkspacePath()
      );
    } else {
      task = await this.createTask(definition);
    }

    const telemetry = getTelemetry();
    telemetry.featureUsed(definition.command);

    return tasks.executeTask(task).then((execution) => {
      if (isDryRun) {
        this.currentDryRun = execution;
      }
    });
  }

  async getProjects(
    json?: WorkspaceJsonConfiguration
  ): Promise<WorkspaceProjects> {
    if (json) {
      return json.projects;
    } else {
      const result = await nxWorkspace();
      if (!result.validWorkspaceJson || !result.workspace) {
        return {};
      } else {
        return result.workspace.projects;
      }
    }
  }

  async getProjectNames(): Promise<string[]> {
    return Object.keys((await this.getProjects()) || {});
  }

  async getProjectEntries(json?: WorkspaceJsonConfiguration) {
    return Object.entries((await this.getProjects(json)) || {});
  }

  async projectForPath(selectedPath: string) {
    if (!this.getWorkspaceJsonPath()) return null;

    const entry = (await this.getProjectEntries()).find(([, def]) => {
      const fullProjectPath = join(
        this.getWorkspacePath(),
        // If root is empty, that means we're in an angular project with the old ng workspace setup. Otherwise use the sourceRoot
        def.root || def.sourceRoot || ''
      );
      if (fullProjectPath === selectedPath) {
        return true;
      }

      const relativePath = relative(fullProjectPath, selectedPath);
      return (
        relativePath &&
        !relativePath.startsWith('..') &&
        !isAbsolute(relativePath)
      );
    });

    return entry ? { name: entry[0], ...entry[1] } : null;
  }
}
