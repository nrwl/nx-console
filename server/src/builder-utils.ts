import { join } from 'path';
import { existsSync } from 'fs';
import { readJsonFile } from './utils';

// For some operations we need to add additional flags or configration in order to make sure we get the expected output.

export const SUPPORTED_KARMA_TEST_BUILDERS = [
  '@angular-devkit/build-angular:karma'
];
export const SUPPORTED_NG_BUILD_BUILDERS = [
  '@angular-devkit/build-angular:dev-server',
  '@angular-devkit/build-angular:browser'
];

export function normalizeCommands(cwd: string, cmds: string[]): string[] {
  const operationName = cmds[0];
  const project = cmds[1];
  const { json: angularJson } = readJsonFile('./angular.json', cwd);
  const builder = getProjectBuilder(project, operationName, angularJson);

  if (SUPPORTED_KARMA_TEST_BUILDERS.includes(builder)) {
    const projectRoot = angularJson.projects[cmds[1]].root;
    const karmaConfigPath = join(cwd, projectRoot, 'karma.conf.js');
    if (existsSync(karmaConfigPath)) {
      process.env.ANGULAR_CONSOLE_ORIGINAL_KARMA_CONFIG_PATH = karmaConfigPath;
      return cmds.concat([
        '--karma-config',
        join(__dirname, './config/karma-angular-console.config.js')
      ]);
    }
  }
  return cmds;
}

export function getProjectBuilder(
  project: string,
  operation: string,
  angularJson: any
): string {
  try {
    return angularJson.projects[project].architect[operation].builder;
  } catch (err) {
    return '';
  }
}
