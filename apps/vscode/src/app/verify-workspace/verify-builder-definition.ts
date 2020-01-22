import { Option } from '@nx-console/schema';
import { readBuilderSchema } from '@nx-console/server';
import { window } from 'vscode';
import { workspaceJsonTreeProvider } from '../workspace-json-tree/workspace-json-tree-provider';
import { getTelemetry } from '../telemetry';
import { cliTaskProvider } from '../cli-task/cli-task-provider';

export async function verifyBuilderDefinition(
  project: string,
  command: string,
  workspaceJson: any
): Promise<{
  validBuilder: boolean;
  builderName: string;
  configurations: string[];
  options: Array<Option>;
}> {
  const projects = workspaceJson.projects || {};
  const projectDef = projects[project] || {};
  const architectDef = projectDef.architect || {};
  const commandDef = architectDef[command] || {};
  const configurations = Object.keys(commandDef.configurations || {});
  const builderName = commandDef.builder;

  if (!builderName) {
    window
      .showErrorMessage(
        `Please update ${project}'s ${command} definition to specify a builder.`,
        'See definition'
      )
      .then(value => {
        if (value) {
          workspaceJsonTreeProvider.revealWorkspaceJsonLabel({
            project: project,
            architect: {
              name: command
            }
          });
        }
      });
    getTelemetry().exception('Builder part of architect definition not found');
    return {
      validBuilder: false,
      configurations,
      builderName: builderName,
      options: []
    };
  }

  const options = await readBuilderSchema(
    cliTaskProvider.getWorkspacePath(),
    builderName
  );

  if (!options) {
    window
      .showErrorMessage(
        `Builder specified for ${project} ${command} was not found in your node_modules. Check that specified builder is correct and has a corresponding entry in package.json`,
        'Show definition'
      )
      .then(value => {
        if (value) {
          workspaceJsonTreeProvider.revealWorkspaceJsonLabel({
            project: project,
            architect: {
              name: command
            }
          });
        }
      });
    getTelemetry().exception('Specified builder not found in node_modules');

    return {
      validBuilder: false,
      builderName,
      configurations,
      options: []
    };
  }

  return {
    validBuilder: true,
    builderName,
    configurations,
    options
  };
}
