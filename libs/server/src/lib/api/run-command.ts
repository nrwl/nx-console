import { Commands } from './commands';
import { readJsonFile } from '../utils';
import { createDetailedStatusCalculator } from './detailed-status-calculator';
import { normalizeCommands } from '../architect-utils';

let commandRunIndex = 0;

export const commands = new Commands(5, 15);

export function runCommand(
  type: string,
  cwd: string,
  programName: string,
  program: string,
  cmds: string[],
  pseudoTerminalFactory: PseudoTerminalFactory,
  addToRecent: boolean = true
) {
  const workspace =
    type === 'new' ? null : readJsonFile('./package.json', cwd).json.name;
  const id = `${program} ${cmds.join(' ')} ${commandRunIndex++}`;
  const command = `${programName} ${cmds.join(' ')}`;

  const factory = () => {
    const commandRunning = pseudoTerminalFactory({
      displayCommand: command,
      name: id,
      program,
      args: normalizeCommands(cwd, cmds),
      cwd
    });
    commandRunning.onDidWriteData(data => {
      commands.addOut(id, data);
    });
    commandRunning.onExit(code => {
      commands.setFinalStatus(id, code === 0 ? 'successful' : 'failed');
    });
    return commandRunning;
  };

  const statusCalculator = createDetailedStatusCalculator(cwd, cmds);

  commands.addCommand(
    type,
    id,
    workspace,
    command,
    factory,
    statusCalculator,
    addToRecent
  );
  commands.startCommand(id);
  return { id };
}

export interface PseudoTerminal {
  onDidWriteData(callback: (data: string) => void): void;

  onExit(callback: (code: number) => void): void;

  setCols(cols: number): void;

  kill(): void;
}

export interface PseudoTerminalConfig {
  /** Human-readable string which will be used to represent the terminal in the UI. */
  name: string;
  program: string;
  args: string[];
  cwd: string;
  displayCommand: string;
}

export type PseudoTerminalFactory = (
  config: PseudoTerminalConfig
) => PseudoTerminal;

import { PseudoTerminalFactory } from '@angular-console/server';
import { platform } from 'os';

export const nodePtyPseudoTerminalFactory: PseudoTerminalFactory = ({
  displayCommand,
  program,
  args,
  cwd
}) => {
  const DEFAULT_ROWS = 24;
  const DEFAULT_COLS = 80;

  const commandRunning = require('node-pty-prebuilt').spawn(program, args, {
    cols: DEFAULT_COLS,
    rows: DEFAULT_ROWS,
    cwd
  });

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
