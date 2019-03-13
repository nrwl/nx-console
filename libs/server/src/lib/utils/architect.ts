import { join } from 'path';
import { existsSync } from 'fs';
import { readJsonFile } from './utils';

// We use known builders to ensure that input flags and output are what we expect.
export const SUPPORTED_KARMA_TEST_BUILDERS = [
  '@angular-devkit/build-angular:karma'
];
export const SUPPORTED_NG_BUILD_BUILDERS = [
  '@angular-devkit/build-angular:dev-server',
  '@angular-devkit/build-angular:browser',
  '@nrwl/builders:web-build',
  '@nrwl/builders:web-dev-server'
];
export const SUPPORTED_NG_BUILD_BUILDERS_WITH_STATS = [
  '@angular-devkit/build-angular:browser',
  '@nrwl/builders:web-build'
];

// For some operations we need to add additional flags or configuration
// in order to make sure we get the expected output.
export function normalizeCommands(cwd: string, cmds: string[]): string[] {
  const operationName = cmds[0];
  const project = cmds[1];
  const { json: angularJson } = readJsonFile('./angular.json', cwd);
  const builder = getProjectArchitect(project, operationName, angularJson)
    .builder;

  // Extend the karma configuration so we can get the output needed.
  if (SUPPORTED_KARMA_TEST_BUILDERS.includes(builder)) {
    const projectRoot = angularJson.projects[cmds[1]].root;
    const karmaConfigPath = join(cwd, projectRoot, 'karma.conf.js');
    if (existsSync(karmaConfigPath)) {
      process.env.ANGULAR_CONSOLE_ORIGINAL_KARMA_CONFIG_PATH = karmaConfigPath;
      return cmds.concat([
        '--karma-config',
        join(__dirname, 'assets', 'karma-angular-console.config.js')
      ]);
    }
  }

  // Make sure we generate stats data so we can parse it later.
  if (SUPPORTED_NG_BUILD_BUILDERS_WITH_STATS.includes(builder)) {
    return cmds.concat(['--stats-json']);
  }
  return cmds;
}

export function getProjectArchitect(
  project: string,
  operation: string,
  angularJson: any
): any {
  try {
    return angularJson.projects[project].architect[operation];
  } catch (err) {
    return {};
  }
}
