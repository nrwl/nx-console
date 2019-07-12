import { PseudoTerminalFactory } from '@angular-console/server';
import { platform } from 'os';

export const nodePtyPseudoTerminalFactory: PseudoTerminalFactory = ({
  displayCommand,
  program,
  args,
  cwd,
  isWsl
}) => {
  const DEFAULT_ROWS = 24;
  const DEFAULT_COLS = 80;
  const opts = {
    cols: DEFAULT_COLS,
    rows: DEFAULT_ROWS,
    cwd
  };

  const nodePty = require('node-pty-prebuilt');
  const commandRunning = isWsl
    ? nodePty.spawn(
        'wsl.exe',
        ['-e', 'bash', '-l', '-i', '-c', `${program} ${args.join(' ')}`],
        opts
      )
    : nodePty.spawn(program, args, opts);

  let currentCols = DEFAULT_COLS;
  let terminated = false;

  return {
    onDidWriteData: callback => {
      const humanReadableCommand = `${displayCommand}\n\n\r`;
      callback(humanReadableCommand);
      commandRunning.on('data', callback);
      commandRunning.on('exit', (exitCode: number) => {
        if (exitCode === 0) {
          callback('\nProcess completed 🙏\n\r');
        } else {
          callback('\nProcess failed 🐳\n\r');
        }
      });
    },
    onExit: callback => {
      commandRunning.on('exit', (code: number) => {
        terminated = true;
        callback(code);
      });
    },
    setCols: cols => {
      if (!terminated && cols !== currentCols) {
        try {
          commandRunning.resize(cols, DEFAULT_ROWS);
          currentCols = cols;
        } catch (e) {
          console.error(e);
        }
      }
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
