import { execFileSync, spawn } from 'child_process';
import { killGroup } from './kill-group';
import {
  ManagedCommandError,
  runManagedCommand,
  spawnManagedProcess,
  stopManagedProcess,
} from './managed-process';

const describePosix = process.platform === 'win32' ? describe.skip : describe;

const isAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const childPids = (pid: number) => {
  try {
    return execFileSync('pgrep', ['-P', `${pid}`], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
      .map(Number);
  } catch {
    return [];
  }
};

const waitFor = async (condition: () => boolean, timeoutMs = 5000) => {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error('condition not met in time');
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};

describePosix('managed processes', () => {
  it('stops the process and the processes it started', async () => {
    const child = spawnManagedProcess('/bin/sh', [
      '-c',
      'sleep 30 & sleep 30; wait',
    ]);
    const pid = child.pid as number;
    // the two sleeps and the wrapper's watcher
    await waitFor(() => childPids(pid).length === 3);
    const grandchildren = childPids(pid);

    await stopManagedProcess(child);

    await waitFor(() => !isAlive(pid));
    await waitFor(() => grandchildren.every((p) => !isAlive(p)));
  });

  it('stops the process when the pipe from its parent closes', async () => {
    // the kernel closes the pipe however the parent ends, including SIGKILL
    const child = spawnManagedProcess('sleep', ['30']);
    const pid = child.pid as number;
    await waitFor(() => childPids(pid).length === 1);

    child.stdin?.destroy();

    await waitFor(() => !isAlive(pid));
  });

  it('resolves with the output of a command', async () => {
    const result = await runManagedCommand('echo out; echo err >&2', {
      timeoutMs: 5000,
    });
    expect(result).toEqual({ stdout: 'out\n', stderr: 'err\n' });
  });

  it('rejects with the output and exit code of a failing command', async () => {
    const error = await runManagedCommand('echo out; exit 3', {
      timeoutMs: 5000,
    }).catch((e) => e);
    expect(error).toBeInstanceOf(ManagedCommandError);
    expect(error).toMatchObject({ code: 3, stdout: 'out\n', timedOut: false });
  });

  it('stops a command that runs past its timeout', async () => {
    const error = await runManagedCommand('sleep 30', { timeoutMs: 200 }).catch(
      (e) => e,
    );
    expect(error).toMatchObject({ timedOut: true });
  });

  it('keeps arguments with spaces intact', async () => {
    const child = spawnManagedProcess('printf', ['%s|', 'one two', '']);
    let output = '';
    child.stdout?.on('data', (data) => (output += data));
    await new Promise((resolve) => child.on('close', resolve));
    expect(output).toBe('one two||');
  });
});

describePosix('killGroup', () => {
  it('signals a process that does not lead a group, and its children in the same group', async () => {
    const parent = spawn('/bin/sh', ['-c', 'sleep 30 & sleep 30; wait'], {
      stdio: 'ignore',
    });
    const pid = parent.pid as number;
    await waitFor(() => childPids(pid).length === 2);
    const children = childPids(pid);

    expect(() => killGroup(pid)).not.toThrow();

    await waitFor(() => !isAlive(pid));
    await waitFor(() => children.every((p) => !isAlive(p)));
  });

  it('leaves descendants that started their own group alone', async () => {
    const parent = spawn(
      process.execPath,
      [
        '-e',
        `const { spawn } = require('child_process');
         const own = spawn('sleep', ['30'], { detached: true, stdio: 'ignore' });
         own.unref();
         console.log(own.pid);
         setInterval(() => {}, 1000);`,
      ],
      // NODE_OPTIONS from the test runner would be inherited otherwise
      { stdio: ['ignore', 'pipe', 'ignore'], env: { PATH: process.env.PATH } },
    );
    const detachedPid = await new Promise<number>((resolve) =>
      parent.stdout?.once('data', (data) => resolve(Number(`${data}`.trim()))),
    );

    killGroup(parent.pid as number);

    await waitFor(() => !isAlive(parent.pid as number));
    expect(isAlive(detachedPid)).toBe(true);
    process.kill(detachedPid, 'SIGKILL');
  });

  it('does not throw for a process that is gone', () => {
    expect(() => killGroup(2 ** 22 + 1)).not.toThrow();
  });
});
