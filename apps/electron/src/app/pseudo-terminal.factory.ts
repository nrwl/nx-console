import { PseudoTerminalFactory } from '@angular-console/server';
import { spawn } from 'node-pty';
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

  const commandRunning = isWsl
    ? spawn(
        'wsl.exe',
        ['-e', 'bash', '-l', '-i', '-c', `${program} ${args.join(' ')}`],
        opts
      )
    : spawn(program, args, opts);

  let currentCols = DEFAULT_COLS;
  let terminated = false;
  let onDidWriteData: (data: string) => void;

  return {
    onDidWriteData: callback => {
      onDidWriteData = callback;
      onDidWriteData(`${displayCommand}\n\r`);
      commandRunning.on('data', data => {
        onDidWriteData(data);
      });
      commandRunning.on('exit', (exitCode: number) => {
        if (exitCode === 0) {
          callback('\n\rProcess completed 🙏\n\r');
        } else {
          callback('\n\rProcess failed 🐳\n\r');
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
      if (onDidWriteData) {
        onDidWriteData('\nProcess failed 🐳');
      }
      if (platform() === 'win32') {
        commandRunning.kill();
      } else {
        commandRunning.kill('SIGKILL');
      }
    }
  };
};
