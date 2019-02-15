import { fileExistsSync } from '../utils/utils';
import * as path from 'path';
import { NpmScript } from '@angular-console/schema';

export function readNpmScripts(
  workspacePath: string,
  packageJson: any
): NpmScript[] {
  const npmClient = fileExistsSync(path.join(workspacePath, 'yarn.lock'))
    ? 'yarn'
    : 'npm';
  return Object.keys(packageJson.scripts || {}).map(name => {
    return { name, npmClient, schema: [] };
  });
}

// TODO: add support for custom schemas
export function readNpmScriptSchema(
  _workspacePath: string,
  _scriptName: string
): any {
  return [
    {
      name: 'arguments',
      type: 'arguments',
      description: 'script arguments',
      required: false,
      positional: false
    }
  ];
}
