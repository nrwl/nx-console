import { Commands } from './commands';
import { createDetailedStatusCalculator } from './detailed-status-calculator';
import { normalizeCommands } from '../utils/architect';
import { PseudoTerminalFactory } from '@angular-console/server';
import { platform } from 'os';
import { FileUtils } from '../utils/file-utils';
import { readJsonFile } from '../utils/utils';
import { existsSync } from 'fs';
import { join } from 'path';
let commandRunIndex = 0;

export const commands = new Commands(5, 15);

export function runCommand(
  type: string,
  cwd: string,
  programName: string,
  program: string,
  cmds: string[],
  pseudoTerminalFactory: PseudoTerminalFactory,
  fileUtils: FileUtils,
  addToRecent: boolean = true
) {
  const workspace =
    type === 'new' ? null : readJsonFile('./package.json', cwd).json.name;
  const id = `${program} ${cmds.join(' ')} ${commandRunIndex++}`;
  let command = `${programName} ${cmds.join(' ')}`;
  if (fileUtils.hasExecutable('nvm', cwd) || existsSync(join(cwd, '.nvmrc'))) {
    const nvm = fileUtils.findClosestNvm(cwd);
    command = `${nvm} exec ${command}`;
  }

  const factory = () => {
    const commandRunning = pseudoTerminalFactory({
      displayCommand: command,
      name: id,
      program,
      args: normalizeCommands(cwd, cmds),
      cwd,
      isWsl: fileUtils.isWsl()
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
  isWsl: boolean;
}

export type PseudoTerminalFactory = (
  config: PseudoTerminalConfig
) => PseudoTerminal;

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

  const nodePtyPrebilt = require('node-pty-prebuilt');
  const commandRunning = isWsl
    ? nodePtyPrebilt.spawn('wsl.exe', ['-e', program, ...args], opts)
    : nodePtyPrebilt.spawn(program, args, opts);

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
