import { execFileSync, execSync } from 'child_process';

/**
 * Signals `pid` together with the processes it started, and never throws.
 *
 * On POSIX this signals the process group led by `pid`. Most processes are not
 * group leaders (a forked language server shares its editor's group), and
 * signalling a group that does not exist fails, so in that case it signals
 * `pid` and those of its descendants that are still in its group. Descendants
 * that started their own group on purpose, like the Nx daemon, are left alone.
 * `pid` itself is skipped when it is the current process, so callers can exit
 * on their own terms.
 */
export function killGroup(pid: number, signal: NodeJS.Signals = 'SIGTERM') {
  if (process.platform === 'win32') {
    try {
      execSync('taskkill /pid ' + pid + ' /T /F', {
        windowsHide: true,
        stdio: 'ignore',
        timeout: 10_000,
      });
    } catch {
      // the process is already gone
    }
    return;
  }

  try {
    process.kill(-pid, signal);
    return;
  } catch {
    // not a group leader, or already gone
  }

  for (const descendant of sameGroupDescendants(pid)) {
    trySignal(descendant, signal);
  }
  if (pid !== process.pid) {
    trySignal(pid, signal);
  }
}

function trySignal(pid: number, signal: NodeJS.Signals) {
  try {
    process.kill(pid, signal);
  } catch {
    // already gone
  }
}

function sameGroupDescendants(root: number): number[] {
  let table: string;
  try {
    table = execFileSync('ps', ['-A', '-o', 'pid=,ppid=,pgid='], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5_000,
    });
  } catch {
    return [];
  }

  const children = new Map<number, number[]>();
  const groups = new Map<number, number>();
  for (const line of table.split('\n')) {
    const [pid, ppid, pgid] = line.trim().split(/\s+/).map(Number);
    if (!pid) continue;
    groups.set(pid, pgid);
    const siblings = children.get(ppid) ?? [];
    siblings.push(pid);
    children.set(ppid, siblings);
  }

  const group = groups.get(root);
  if (group === undefined) {
    return [];
  }
  const result: number[] = [];
  const queue = [...(children.get(root) ?? [])];
  while (queue.length) {
    const pid = queue.shift() as number;
    if (groups.get(pid) !== group) continue;
    result.push(pid);
    queue.push(...(children.get(pid) ?? []));
  }
  return result;
}
