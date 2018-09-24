import { join } from 'path';

export function normalize(cwd: string, cmds: string[]): string[] {
  const operationName = cmds[0];
  switch (operationName) {
    case 'test':
      const angularJson = require(join(cwd, 'angular.json'));
      const projectRoot = angularJson.projects[cmds[1]].root;
      const karmaConfigPath = join(cwd, projectRoot, 'karma.conf.js');
      process.env.ANGULAR_CONSOLE_ORIGINAL_KARMA_CONFIG_PATH = karmaConfigPath;
      return cmds.concat([
        '--karma-config',
        join(__dirname, '../config/karma-angular-console.config.js')
      ]);
    default:
      return cmds;
  }
}
