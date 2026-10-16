import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import { killGroup } from './kill-group';

/*
 * On POSIX the command runs as the leader of a new process group, so the whole
 * tree it starts (shells, package manager wrappers, Nx plugin workers) can be
 * signalled at once.
 *
 * A child does not notice when its parent dies, so a crashed or force-quit
 * editor would leave the group running forever. The wrapper keeps a pipe from
 * this process open in a background subshell and terminates the group when the
 * pipe reaches end of file, which the kernel guarantees however this process
 * ends. `exec` makes the command itself the group leader, so its pid is the
 * group id.
 */
const PARENT_DEATH_WRAPPER =
  'exec 3<&0; ' +
  '(while read -r _ <&3; do :; done; kill -TERM -$$) </dev/null >/dev/null 2>&1 & ' +
  'exec "$@" 3<&- </dev/null';

const running = new Set<ChildProcess>();

export type ManagedSpawnOptions = Omit<
  SpawnOptions,
  'detached' | 'stdio' | 'shell'
> & {
  /** Run `command` through a shell, with `args` appended. */
  shell?: boolean;
};

/**
 * Spawns a process that can be stopped together with everything it starts and
 * that does not outlive this process. stdout and stderr are pipes.
 */
export function spawnManagedProcess(
  command: string,
  args: string[],
  options: ManagedSpawnOptions = {},
): ChildProcess {
  const { shell, ...rest } = options;
  let child: ChildProcess;

  if (process.platform === 'win32') {
    child = spawn(command, args, {
      ...rest,
      shell,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } else {
    const target = shell
      ? ['/bin/sh', '-c', [command, ...args].join(' ')]
      : [command, ...args];
    child = spawn('/bin/sh', ['-c', PARENT_DEATH_WRAPPER, 'sh', ...target], {
      ...rest,
      detached: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    child.stdin?.on('error', () => {
      // the wrapper is gone already
    });
  }

  running.add(child);
  child.on('exit', () => {
    running.delete(child);
    // Closing the pipe makes the wrapper stop whatever the command left behind.
    child.stdin?.end();
  });
  child.on('error', () => running.delete(child));
  return child;
}

/**
 * Stops a process started with `spawnManagedProcess` and everything it started:
 * SIGTERM first, SIGKILL for whatever is left after `graceMs`.
 */
export async function stopManagedProcess(
  child: ChildProcess,
  graceMs = 3000,
): Promise<void> {
  const pid = child.pid;
  if (!pid) {
    return;
  }
  if (process.platform === 'win32') {
    if (!hasExited(child)) {
      killGroup(pid);
    }
    return;
  }

  signalGroup(pid, 'SIGTERM');
  const deadline = Date.now() + graceMs;
  while (groupExists(pid) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  signalGroup(pid, 'SIGKILL');
}

/**
 * Signals every process started with `spawnManagedProcess` that is still
 * running. Synchronous, so it can be used while the current process exits.
 */
export function killAllManagedProcesses(signal: NodeJS.Signals = 'SIGTERM') {
  for (const child of running) {
    if (!child.pid) {
      continue;
    }
    if (process.platform === 'win32') {
      killGroup(child.pid, signal);
    } else {
      signalGroup(child.pid, signal);
    }
  }
  running.clear();
}

export class ManagedCommandError extends Error {
  readonly stdout: string;
  readonly stderr: string;
  readonly code: number | null;
  readonly timedOut: boolean;

  constructor(
    message: string,
    stdout: string,
    stderr: string,
    code: number | null,
    timedOut: boolean,
  ) {
    super(message);
    this.name = 'ManagedCommandError';
    this.stdout = stdout;
    this.stderr = stderr;
    this.code = code;
    this.timedOut = timedOut;
  }
}

/**
 * Runs a shell command without blocking the event loop and resolves with its
 * output. Rejects with a `ManagedCommandError` when the command fails or runs
 * longer than `timeoutMs`; on timeout the command and everything it started is
 * stopped.
 */
export function runManagedCommand(
  command: string,
  options: Omit<ManagedSpawnOptions, 'shell'> & { timeoutMs: number },
): Promise<{ stdout: string; stderr: string }> {
  const { timeoutMs, ...spawnOptions } = options;
  return new Promise((resolve, reject) => {
    const child = spawnManagedProcess(command, [], {
      ...spawnOptions,
      shell: true,
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;
    let drain: ReturnType<typeof setTimeout> | undefined;
    child.stdout?.on('data', (data) => (stdout += data.toString()));
    child.stderr?.on('data', (data) => (stderr += data.toString()));

    const timer = setTimeout(() => {
      timedOut = true;
      stopManagedProcess(child, 1000);
    }, timeoutMs);

    child.on('error', (error) => {
      clearTimeout(timer);
      settled = true;
      reject(
        new ManagedCommandError(error.message, stdout, stderr, null, false),
      );
    });
    // A process that moved to its own group (a daemon, for example) can keep
    // stdout open after the command is done, and then 'close' never comes.
    child.on('exit', (code) => {
      drain = setTimeout(() => {
        child.stdout?.destroy();
        child.stderr?.destroy();
        settle(code);
      }, 2000);
    });
    child.on('close', (code) => settle(code));

    function settle(code: number | null) {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      clearTimeout(drain);
      if (code === 0 && !timedOut) {
        resolve({ stdout, stderr });
        return;
      }
      const reason = timedOut
        ? `timed out after ${timeoutMs} ms`
        : `exited with code ${code}`;
      reject(
        new ManagedCommandError(
          `\`${command}\` ${reason}`,
          stdout,
          stderr,
          code,
          timedOut,
        ),
      );
    }
  });
}

function hasExited(child: ChildProcess) {
  return child.exitCode !== null || child.signalCode !== null;
}

/*
 * A managed process always leads its own group on POSIX, and the group outlives
 * it while anything it started is still running. Unlike `killGroup`, this never
 * falls back to the pid, which may belong to another process by now.
 */
function signalGroup(pgid: number, signal: NodeJS.Signals) {
  try {
    process.kill(-pgid, signal);
  } catch {
    // the whole group is gone
  }
}

function groupExists(pgid: number) {
  try {
    process.kill(-pgid, 0);
    return true;
  } catch {
    return false;
  }
}
