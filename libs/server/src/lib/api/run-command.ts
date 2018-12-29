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
  spawn: PseudoTerminalFactory,
  addToRecent: boolean = true
) {
  const workspace =
    type === 'new' ? null : readJsonFile('./package.json', cwd).json.name;
  const id = `${program} ${cmds.join(' ')} ${commandRunIndex++}`;
  const command = `${programName} ${cmds.join(' ')}`;

  const factory = () => {
    const commandRunning = spawn({
      name: id,
      command: program,
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

  kill(): void;
}

export interface PseudoTerminalConfig {
  /** Human-readable string which will be used to represent the terminal in the UI. */
  name: string;
  command: string;
  args: string[];
  cwd: string;
}

export type PseudoTerminalFactory = (
  config: PseudoTerminalConfig
) => PseudoTerminal;
