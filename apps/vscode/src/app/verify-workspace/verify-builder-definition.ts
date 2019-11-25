import { Schema } from '@angular-console/schema';
import { readSchema } from '@angular-console/server';
import { window } from 'vscode';
import { angularJsonTreeProvider } from '../angular-json-tree/angular-json-tree-provider';
import { getTelemetry } from '../telemetry';
import { ngTaskProvider } from '../ng-task/ng-task-provider';

export function verifyBuilderDefinition(
  project: string,
  command: string,
  angularJson: any
): { validBuilder: boolean; builderName: string; schema: Array<Schema> } {
  const projects = angularJson.projects || {};
  const projectDef = projects[project] || {};
  const architectDef = projectDef.architect || {};
  const commandDef = architectDef[command] || {};
  const builderName = commandDef.builder;

  if (!builderName) {
    window
      .showErrorMessage(
        `Please update ${project}'s ${command} definition to specify a builder.`,
        'See definition'
      )
      .then(value => {
        if (value) {
          angularJsonTreeProvider.revealAngularJsonLabel({
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
      builderName: builderName,
      schema: []
    };
  }

  const schema = readSchema(ngTaskProvider.getWorkspacePath(), builderName);

  if (!schema) {
    window
      .showErrorMessage(
        `Builder specified for ${project} ${command} was not found in your node_modules. Check that specified builder is correct and has a corresponding entry in package.json`,
        'Show definition'
      )
      .then(value => {
        if (value) {
          angularJsonTreeProvider.revealAngularJsonLabel({
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
      schema: []
    };
  }

  return {
    validBuilder: true,
    builderName,
    schema
  };
}
