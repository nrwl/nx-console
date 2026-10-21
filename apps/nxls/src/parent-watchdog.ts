import { Worker } from 'worker_threads';

/*
 * Runs on its own thread, so it keeps working while the main event loop is
 * blocked by a synchronous call or a long computation. When the editor process
 * is gone it kills the processes nxls started in its own process group and
 * then nxls itself; a blocked nxls could not run its exit handler.
 *
 * A parent that dies while it is the direct parent shows up as a changed ppid
 * (POSIX reparents orphans). The signal-0 probe covers Windows and editors that
 * start nxls through an intermediate process.
 */
const WATCHDOG_SOURCE = `
const { workerData } = require('worker_threads');
const { execFileSync } = require('child_process');
const { editorPid, initialPpid, intervalMs } = workerData;

function editorGone() {
  if (editorPid === initialPpid && process.ppid !== initialPpid) {
    return true;
  }
  try {
    process.kill(editorPid, 0);
    return false;
  } catch (e) {
    return e.code === 'ESRCH';
  }
}

function sameGroupDescendants() {
  if (process.platform === 'win32') return [];
  let table;
  try {
    table = execFileSync('ps', ['-A', '-o', 'pid=,ppid=,pgid='], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    });
  } catch {
    return [];
  }
  const rows = table.split('\\n').map((l) => l.trim().split(/\\s+/).map(Number));
  const group = rows.find(([pid]) => pid === process.pid)?.[2];
  const result = [];
  const queue = [process.pid];
  while (queue.length) {
    const parent = queue.shift();
    for (const [pid, ppid, pgid] of rows) {
      if (ppid === parent && pgid === group) {
        result.push(pid);
        queue.push(pid);
      }
    }
  }
  return result;
}

setInterval(() => {
  if (!editorGone()) return;
  for (const pid of sameGroupDescendants()) {
    try { process.kill(pid, 'SIGKILL'); } catch {}
  }
  process.kill(process.pid, 'SIGKILL');
}, intervalMs);
`;

export function startParentWatchdog(editorPid: number | null | undefined) {
  if (typeof editorPid !== 'number' || editorPid <= 0) {
    return;
  }
  const worker = new Worker(WATCHDOG_SOURCE, {
    eval: true,
    workerData: { editorPid, initialPpid: process.ppid, intervalMs: 3000 },
  });
  worker.unref();
}
