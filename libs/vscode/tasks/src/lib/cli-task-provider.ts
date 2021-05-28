import { join } from 'path';
import {
  ProviderResult,
  Task,
  TaskExecution,
  TaskProvider,
  tasks,
} from 'vscode';

import { getTelemetry } from '@nx-console/server';
import { verifyWorkspace } from '@nx-console/vscode/nx-workspace';
import { verifyNodeModules } from '@nx-console/vscode/verify';
import { CliTask } from './cli-task';
import {
  CliTaskDefinition,
  NamedProject,
  ProjectDef,
  Projects,
  WorkspaceJson,
} from './cli-task-definition';
import { NxTask } from './nx-task';
import { WORKSPACE_GENERATOR_NAME_REGEX } from '@nx-console/schema';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';

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
    return join(this.getWorkspaceJsonPath(), '..');
  }

  getWorkspaceJsonPath() {
    return WorkspaceConfigurationStore.instance.get('nxWorkspaceJsonPath', '');
  }

  provideTasks(): ProviderResult<Task[]> {
    return null;
  }

  resolveTask(task: Task): Task | undefined {
    if (
      this.getWorkspaceJsonPath() &&
      task.definition.command &&
      task.definition.project
    ) {
      const cliTask = this.createTask({
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

  createTask(definition: CliTaskDefinition) {
    return CliTask.create(definition, this.getWorkspaceJsonPath());
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
      task = this.createTask(definition);
    }

    const telemetry = getTelemetry();
    telemetry.featureUsed(definition.command);

    return tasks.executeTask(task).then((execution) => {
      if (isDryRun) {
        this.currentDryRun = execution;
      }
    });
  }

  getProjects(json?: WorkspaceJson): Projects {
    if (json) {
      return json.projects;
    } else {
      const result = verifyWorkspace();
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
    if (!this.getWorkspaceJsonPath()) return null;

    const entry = this.getProjectEntries().find(([_, def]) =>
      selectedPath.startsWith(join(this.getWorkspacePath(), def.root))
    );

    return entry ? { name: entry[0], ...entry[1] } : null;
  }
}
