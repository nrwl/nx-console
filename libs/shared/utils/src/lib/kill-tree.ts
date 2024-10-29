// Adapted from https://raw.githubusercontent.com/pkrumins/node-tree-kill/deee138/index.jss
import { spawn, exec, ExecException, ChildProcess } from 'child_process';

type ProcessTree = Record<number, number[]>;
type ProcessMap = Record<number, number>;
type SpawnFunction = (parentPid: number) => ChildProcess;
type CallbackFunction = (error?: ExecException | null) => void;

export async function killTree(
  pid: number,
  signal: NodeJS.Signals = 'SIGTERM'
): Promise<void> {
  const tree: ProcessTree = {};
  const pidsToProcess: ProcessMap = {};
  tree[pid] = [];
  pidsToProcess[pid] = 1;

  return new Promise<void>((resolve, reject) => {
    const callback: CallbackFunction = (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    switch (process.platform) {
      case 'win32':
        exec(
          'taskkill /pid ' + pid + ' /T /F',
          {
            windowsHide: true,
          },
          (error) => {
            // Ignore Fatal errors (128) because it might be due to the process already being killed.
            // On Linux/Mac we can check ESRCH (no such process), but on Windows we can't.
            callback(error?.code !== 128 ? error : null);
          }
        );
        break;
      case 'darwin':
        buildProcessTree(
          pid,
          tree,
          pidsToProcess,
          function (parentPid: number): ChildProcess {
            return spawn('pgrep', ['-P', `${parentPid}`], {
              windowsHide: false,
            });
          },
          function (): void {
            killAll(tree, signal, callback);
          }
        );
        break;
      default: // Linux
        buildProcessTree(
          pid,
          tree,
          pidsToProcess,
          function (parentPid: number): ChildProcess {
            return spawn(
              'ps',
              ['-o', 'pid', '--no-headers', '--ppid', `${parentPid}`],
              {
                windowsHide: false,
              }
            );
          },
          function (): void {
            killAll(tree, signal, callback);
          }
        );
        break;
    }
  });
}

function killAll(
  tree: ProcessTree,
  signal: NodeJS.Signals,
  callback?: CallbackFunction
): void {
  const killed: ProcessMap = {};
  try {
    Object.keys(tree).forEach(function (pid) {
      tree[parseInt(pid, 10)].forEach(function (pidpid) {
        if (!killed[pidpid]) {
          killPid(pidpid, signal);
          killed[pidpid] = 1;
        }
      });
      if (!killed[parseInt(pid, 10)]) {
        killPid(parseInt(pid, 10), signal);
        killed[parseInt(pid, 10)] = 1;
      }
    });
  } catch (err) {
    if (callback) {
      return callback(err as ExecException);
    } else {
      throw err;
    }
  }
  if (callback) {
    return callback();
  }
}

function killPid(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(pid, signal);
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code !== 'ESRCH') throw err;
  }
}

function buildProcessTree(
  parentPid: number,
  tree: ProcessTree,
  pidsToProcess: ProcessMap,
  spawnChildProcessesList: SpawnFunction,
  cb: () => void
): void {
  const ps = spawnChildProcessesList(parentPid);
  let allData = '';
  ps.stdout?.on('data', (data: Buffer | string) => {
    const strData = data.toString('ascii');
    allData += strData;
  });

  const onClose = function (code: number): void {
    delete pidsToProcess[parentPid];

    if (code != 0) {
      // no more parent processes
      if (Object.keys(pidsToProcess).length == 0) {
        cb();
      }
      return;
    }

    const pids = allData.match(/\d+/g);
    if (pids) {
      pids.forEach((_pid) => {
        const pid = parseInt(_pid, 10);
        tree[parentPid].push(pid);
        tree[pid] = [];
        pidsToProcess[pid] = 1;
        buildProcessTree(pid, tree, pidsToProcess, spawnChildProcessesList, cb);
      });
    }
  };

  ps.on('close', onClose);
}
