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

  let normalized = cmds;

  // Make sure we use progress reporter so that we can parse the output consistently.
  if (SUPPORTED_KARMA_TEST_BUILDERS.includes(builder)) {
    const projectRoot = angularJson.projects[cmds[1]].root;
    const karmaConfigPath = join(cwd, projectRoot, 'karma.conf.js');
    const isUsingKarma = existsSync(karmaConfigPath);
    if (isUsingKarma) {
      normalized = cmds.concat(['--reporters', 'progress']);
    }
  }

  // Make sure we generate stats data so we can parse it later.
  if (SUPPORTED_NG_BUILD_BUILDERS_WITH_STATS.includes(builder)) {
    normalized = normalized.concat(['--stats-json']);
  }

  return normalized;
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
