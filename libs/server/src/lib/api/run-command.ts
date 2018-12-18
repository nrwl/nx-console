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
  addToRecent: boolean = true
) {
  const workspace =
    type === 'new' ? null : readJsonFile('./package.json', cwd).json.name;
  const id = `${program} ${cmds.join(' ')} ${commandRunIndex++}`;
  const command = `${programName} ${cmds.join(' ')}`;
  const factory = createExecutableCommand(id, cwd, program, cmds);
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

function createExecutableCommand(
  id: string,
  cwd: string,
  program: string,
  cmds: string[]
) {
  return () => {
    const commandRunning = require('node-pty-prebuilt').spawn(
      program,
      normalizeCommands(cwd, cmds),
      {
        cwd,
        cols: 80
      }
    );
    commandRunning.on('data', (data: any) => {
      commands.addOut(id, data.toString());
    });
    commandRunning.on('exit', (code: any) => {
      commands.setFinalStatus(id, code === 0 ? 'successful' : 'failed');
    });
    return commandRunning;
  };
}
