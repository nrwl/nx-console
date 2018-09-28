import * as os from 'os';
import {
  createDetailedStatusCalculator,
  DetailedStatusCalculator
} from './detailed-status-calculator';

const spawn = require('node-pty-prebuilt').spawn;

interface CommandResult {
  command: string;
  status: string;
  out: string;
  commandRunning: any;
  detailedStatusCalculator: DetailedStatusCalculator<any>;
}

let commandRunIndex = 0;
export let commandInProgress: CommandResult | null;

export function runCommand(cwd: string, program: string, cmds: string[]) {
  stopAllCommands();
  const command = `${program} ${cmds.join(' ')} ${commandRunIndex++}`;
  const commandRunning = spawn(program, cmds, { cwd, cols: 80 });

  commandInProgress = {
    command,
    status: 'inprogress',
    out: '',
    commandRunning,
    detailedStatusCalculator: createDetailedStatusCalculator(cmds[0])
  };

  commandRunning.on('data', (data: any) => {
    if (commandInProgress && commandInProgress.command === command) {
      const d = data.toString();
      commandInProgress.out += d;
      commandInProgress.detailedStatusCalculator.addOut(d);
    }
  });

  commandRunning.on('exit', (code: any) => {
    if (commandInProgress && commandInProgress.command === command) {
      const status = code === 0 ? 'success' : 'failure';
      commandInProgress.status = status;
      commandInProgress.detailedStatusCalculator.setStatus(status);
    }
  });
  return { command };
}

export function stopAllCommands() {
  if (commandInProgress && commandInProgress.commandRunning) {
    if (os.platform() === 'win32') {
      commandInProgress.commandRunning.kill();
    } else {
      commandInProgress.commandRunning.kill('SIGKILL');
    }
  }
  commandInProgress = null;
}
