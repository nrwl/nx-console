import { Option } from '@nx-console/schema';
import { readExecutorSchema } from '@nx-console/server';
import { window } from 'vscode';
import { workspaceJsonTreeProvider } from '../workspace-json-tree/workspace-json-tree-provider';
import { getTelemetry } from '../telemetry';
import { cliTaskProvider } from '../cli-task/cli-task-provider';
import { OptionType } from '@angular/cli/models/interface';
import { join } from 'path';
import { existsSync } from 'fs';

const RUN_ONE_OPTIONS = [
  {
    name: 'with-deps',
    type: OptionType.Boolean,
    description:
      'Include dependencies of specified projects when computing what to run',
    default: false
  },
  {
    name: 'parallel',
    type: OptionType.Boolean,
    description: 'Parallelize the command',
    default: 'false'
  },
  {
    name: 'maxParallel',
    type: OptionType.Number,
    description: 'Max number of parallel processes',
    default: 3
  },
  {
    name: 'only-failed',
    type: OptionType.Boolean,
    description: 'Isolate projects which previously failed',
    default: 'false'
  },
  {
    name: 'skip-nx-cache',
    type: OptionType.Boolean,
    description:
      'Rerun the tasks even when the results are available in the cache',
    default: false
  },
  {
    name: 'exclude',
    type: OptionType.String,
    description: 'Exclude certain projects from being processed'
  }
].map(v => ({ ...v, aliases: [] }));

export async function verifyExecutorDefinition(
  project: string,
  command: string,
  workspaceJson: any
): Promise<{
  validExecutor: boolean;
  executorName: string;
  configurations: string[];
  options: Array<Option>;
}> {
  const projects = workspaceJson.projects || {}; // TODO: projects is type any
  const projectDef = projects[project] || {};
  const targetDef = projectDef.targets || projectDef.architect || {};
  const commandDef = targetDef[command] || {};
  const configurations = Object.keys(commandDef.configurations || {});
  const executorName = commandDef.executor || commandDef.builder;

  if (!executorName) {
    window
      .showErrorMessage(
        `Please update ${project}'s ${command} definition to specify an executor or builder.`,
        'See definition'
      )
      .then(value => {
        if (value) {
          workspaceJsonTreeProvider.revealWorkspaceJsonLabel({
            project: project,
            target: {
              name: command
            }
          });
        }
      });
    getTelemetry().exception('Builder part of target or architect definition not found');
    return {
      validExecutor: false,
      configurations,
      executorName,
      options: []
    };
  }

  const options = await readExecutorSchema(
    cliTaskProvider.getWorkspacePath(),
    executorName
  );

  if (!options) {
    window
      .showErrorMessage(
        `Executor or builder specified for ${project} ${command} was not found in your node_modules. Check that specified executor or builder is correct and has a corresponding entry in package.json`,
        'Show definition'
      )
      .then(value => {
        if (value) {
          workspaceJsonTreeProvider.revealWorkspaceJsonLabel({
            project,
            target: {
              name: command
            }
          });
        }
      });
    getTelemetry().exception('Specified executor or builder not found in node_modules');

    return {
      validExecutor: false,
      executorName,
      configurations,
      options: []
    };
  }

  const isNxWorkspace = existsSync(
    join(cliTaskProvider.getWorkspacePath(), 'nx.json')
  );
  return {
    validExecutor: true,
    executorName,
    configurations,
    options: isNxWorkspace ? [...RUN_ONE_OPTIONS, ...options] : options
  };
}
