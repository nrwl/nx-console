import { listFilesRec } from '../utils';

import * as os from 'os';
const spawn = require('node-pty-prebuilt').spawn;

interface CommandResult {
  command: string;
  status: string;
  out: string;
  commandRunning: any;
}

let commandRunIndex = 0;
export let commandInProgress: CommandResult | null;
export const files: { [path: string]: string[] } = {};

export function runCommand(cwd: string, program: string, cmds: string[]) {
  stopAllCommands();
  const command = `${program} ${cmds.join(' ')} ${commandRunIndex++}`;
  const commandRunning = spawn(program, cmds, { cwd, cols: 80 });
  commandInProgress = {
    command,
    status: 'inprogress',
    out: '',
    commandRunning
  };

  commandRunning.on('data', (data: any) => {
    if (commandInProgress && commandInProgress.command === command) {
      commandInProgress.out += data.toString();
    }
  });

  commandRunning.on('exit', (code: any) => {
    if (commandInProgress && commandInProgress.command === command) {
      commandInProgress.status = code === 0 ? 'success' : 'failure';
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

export function listFiles(path: string) {
  setTimeout(() => {
    files[path] = listFilesRec(path);
    setTimeout(() => {
      listFiles(path);
    }, 60000);
  }, 0);
}
