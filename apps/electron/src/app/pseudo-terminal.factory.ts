import { PseudoTerminalFactory } from '@angular-console/server';
import { IPty, spawn } from 'node-pty';
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

  let commandRunning: IPty;
  if (platform() === 'win32') {
    commandRunning = isWsl
      ? spawn(
          'wsl.exe',
          ['-e', 'bash', '-l', '-i', '-c', `${program} ${args.join(' ')}`],
          opts
        )
      : spawn(
          'C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
          `-Sta -NoLogo -NonInteractive -C "& {& '${program}' ${args.join(
            ' '
          )}}"`,
          opts
        );
  } else {
    commandRunning = spawn(
      '/bin/bash',
      ['-l', '-i', '-c', `${program} ${args.join(' ')}`],
      opts
    );
  }

  let currentCols = DEFAULT_COLS;
  let terminated = false;

  return {
    onDidWriteData: callback => {
      callback(`${displayCommand}\n\n\r`);
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
