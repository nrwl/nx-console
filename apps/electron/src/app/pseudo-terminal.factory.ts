import { PseudoTerminalFactory } from '@angular-console/server';
import { platform } from 'os';

export const pseudoTerminalFactory: PseudoTerminalFactory = ({
  command,
  args,
  cwd
}) => {
  const commandRunning = require('node-pty-prebuilt').spawn(command, args, {
    cols: 80,
    cwd
  });

  return {
    onDidWriteData: callback => {
      const humanReadableCommand = `${command} ${args.join(' ')}\n\n\r`;
      callback(humanReadableCommand);
      commandRunning.on('data', callback);
      commandRunning.on('exit', (exitCode: number) => {
        if (exitCode === 0) {
          callback('\nProcess completed 🙏');
        } else {
          callback('\nProcess failed 🐳');
        }
      });
    },
    onExit: callback => {
      commandRunning.on('exit', callback);
    },
    kill: () => {
      if (platform() === 'win32') {
        commandRunning.kill();
      } else {
        commandRunning.kill('SIGKILL');
      }
    }
  };
};
