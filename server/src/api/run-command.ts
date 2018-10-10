import { RecentCommands } from './commands';
import { readJsonFile } from '../utils';
import { createDetailedStatusCalculator } from './detailed-status-calculator';
// noinspection TsLint
const spawn = require('node-pty-prebuilt').spawn;

let commandRunIndex = 0;

export const recentCommands = new RecentCommands(5);

export function runCommand(
  type: string,
  cwd: string,
  programName: string,
  program: string,
  cmds: string[]
) {
  const workspace =
    type === 'new' ? null : readJsonFile('./package.json', cwd).json.name;
  const id = `${program} ${cmds.join(' ')} ${commandRunIndex++}`;
  const command = `${programName} ${cmds.join(' ')}`;
  const factory = createExecutableCommand(id, cwd, program, cmds);
  const statusCalculator = createDetailedStatusCalculator(cmds[0]);

  recentCommands.addCommand(
    type,
    id,
    workspace,
    command,
    factory,
    statusCalculator
  );
  recentCommands.restartCommand(id);
  return { id };
}

function createExecutableCommand(
  id: string,
  cwd: string,
  program: string,
  cmds: string[]
) {
  return () => {
    const commandRunning = spawn(program, cmds, { cwd, cols: 80 });
    commandRunning.on('data', (data: any) => {
      recentCommands.addOut(id, data.toString());
    });
    commandRunning.on('exit', (code: any) => {
      recentCommands.setFinalStatus(id, code === 0 ? 'successful' : 'failed');
    });
    return commandRunning;
  };
}
