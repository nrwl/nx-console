import { execSync } from 'child_process';

export function killGroup(pid: number, signal: NodeJS.Signals = 'SIGTERM') {
  if (process.platform === 'win32') {
    try {
      execSync('taskkill /pid ' + pid + ' /T /F', {
        windowsHide: true,
      });
    } catch (err: any) {
      if (err?.status !== 128) {
        throw err;
      }
    }
  } else {
    process.kill(-pid, signal);
  }
}
