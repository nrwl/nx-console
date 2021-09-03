import { Option } from '@nx-console/schema';
import { readBuilderSchema, getTelemetry } from '@nx-console/server';
import { window } from 'vscode';
import { OptionType } from '@angular/cli/models/interface';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { revealNxProject } from '@nx-console/vscode/nx-workspace';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { WorkspaceJsonConfiguration } from '@nrwl/devkit';

const RUN_ONE_OPTIONS = [
  {
    name: 'with-deps',
    type: OptionType.Boolean,
    description:
      'Include dependencies of specified projects when computing what to run',
    default: false,
  },
  {
    name: 'parallel',
    type: OptionType.Boolean,
    description: 'Parallelize the command',
    default: 'false',
  },
  {
    name: 'maxParallel',
    type: OptionType.Number,
    description: 'Max number of parallel processes',
    default: 3,
  },
  {
    name: 'only-failed',
    type: OptionType.Boolean,
    description: 'Isolate projects which previously failed',
    default: 'false',
  },
  {
    name: 'skip-nx-cache',
    type: OptionType.Boolean,
    description:
      'Rerun the tasks even when the results are available in the cache',
    default: false,
  },
  {
    name: 'exclude',
    type: OptionType.String,
    description: 'Exclude certain projects from being processed',
  },
].map((v) => ({ ...v, aliases: [] }));

export async function verifyBuilderDefinition(
  project: string,
  command: string,
  workspaceJson: WorkspaceJsonConfiguration
): Promise<{
  validBuilder: boolean;
  builderName: string;
  configurations: string[];
  options: Array<Option>;
}> {
  const projects = workspaceJson.projects || {};
  const projectDef = projects[project] || {};
  const targetDef = projectDef.targets || {};
  const commandDef = targetDef[command] || {};
  const configurations = Object.keys(commandDef.configurations || {});
  const executorName = commandDef.executor;

  if (!executorName) {
    window
      .showErrorMessage(
        `Please update ${project}'s ${command} definition to specify a builder.`,
        'See definition'
      )
      .then((value) => {
        if (value) {
          revealNxProject(project, {
            name: command,
          });
        }
      });
    getTelemetry().exception('Builder part of architect definition not found');
    return {
      validBuilder: false,
      configurations,
      builderName: executorName,
      options: [],
    };
  }

  const options = await readBuilderSchema(
    workspacePath(),
    executorName,
    commandDef.options
  );

  if (!options) {
    window
      .showErrorMessage(
        `Builder specified for ${project} ${command} was not found in your node_modules. Check that specified builder is correct and has a corresponding entry in package.json`,
        'Show definition'
      )
      .then((value) => {
        if (value) {
          revealNxProject(project, {
            name: command,
          });
        }
      });
    getTelemetry().exception('Specified builder not found in node_modules');

    return {
      validBuilder: false,
      builderName: executorName,
      configurations,
      options: [],
    };
  }

  const isNxWorkspace = existsSync(join(workspacePath(), 'nx.json'));
  return {
    validBuilder: true,
    builderName: executorName,
    configurations,
    options: isNxWorkspace ? [...RUN_ONE_OPTIONS, ...options] : options,
  };
}

function workspacePath() {
  return dirname(
    WorkspaceConfigurationStore.instance.get('nxWorkspaceJsonPath', '')
  );
}
