import { WorkspaceJsonConfiguration } from '@nrwl/devkit';
import { fileExists } from '@nx-console/shared/file-system';
import { Option, OptionType } from '@nx-console/shared/schema';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { getTelemetry, readBuilderSchema } from '@nx-console/vscode/utils';
import { join } from 'path';
import { window } from 'vscode';

const RUN_ONE_OPTIONS = [
  {
    name: 'with-deps',
    type: OptionType.Boolean,
    isRequired: false,
    description:
      'Include dependencies of specified projects when computing what to run',
    default: false,
  },
  {
    name: 'parallel',
    type: OptionType.Boolean,
    isRequired: false,
    description: 'Parallelize the command',
    default: 'false',
  },
  {
    name: 'maxParallel',
    type: OptionType.Number,
    isRequired: false,
    description: 'Max number of parallel processes',
    default: 3,
  },
  {
    name: 'only-failed',
    type: OptionType.Boolean,
    isRequired: false,
    description: 'Isolate projects which previously failed',
    default: 'false',
  },
  {
    name: 'skip-nx-cache',
    type: OptionType.Boolean,
    isRequired: false,
    description:
      'Rerun the tasks even when the results are available in the cache',
    default: false,
  },
  {
    name: 'exclude',
    isRequired: false,
    type: OptionType.String,
    description: 'Exclude certain projects from being processed',
  },
].map((v) => ({ ...v, aliases: [] }));

export async function verifyBuilderDefinition(
  project: string,
  command: string,
  workspaceJson: WorkspaceJsonConfiguration,
  workspaceType: 'ng' | 'nx'
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
    window.showErrorMessage(
      `Please update ${project}'s ${command} definition to specify a builder.`,
      'See definition'
    );
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
    workspaceType,
    projects,
    commandDef.options
  );

  if (!options) {
    window.showErrorMessage(
      `Builder specified for ${project} ${command} was not found in your dependencies. Check that specified builder is correct and has a corresponding entry in package.json`,
      'Show definition'
    );
    getTelemetry().exception('Specified builder not found in dependencies');

    return {
      validBuilder: false,
      builderName: executorName,
      configurations,
      options: [],
    };
  }

  const isNxWorkspace = await fileExists(join(workspacePath(), 'nx.json'));
  return {
    validBuilder: true,
    builderName: executorName,
    configurations,
    options: isNxWorkspace ? [...RUN_ONE_OPTIONS, ...options] : options,
  };
}

function workspacePath() {
  return WorkspaceConfigurationStore.instance.get('nxWorkspacePath', '');
}
