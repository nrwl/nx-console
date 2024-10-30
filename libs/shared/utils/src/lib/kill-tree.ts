// adapted from https://raw.githubusercontent.com/pkrumins/node-tree-kill/deee138/index.js
import { execSync, spawn } from 'child_process';

export function killTree(pid: number, signal?: NodeJS.Signals) {
  pid = parseInt(pid as any);
  if (Number.isNaN(pid)) {
    throw new Error('pid must be a number');
  }

  const tree: any = {};
  const pidsToProcess: any = {};
  tree[pid] = [];
  pidsToProcess[pid] = 1;

  switch (process.platform) {
    case 'win32':
      try {
        execSync('taskkill /pid ' + pid + ' /T /F', {
          windowsHide: true,
        });
      } catch (err: any) {
        if (err?.code !== 128) {
          throw err;
        }
      }
      break;
    case 'darwin':
      buildProcessTree(
        pid,
        tree,
        pidsToProcess,
        function (parentPid: any) {
          return spawn('pgrep', ['-P', parentPid]);
        },
        function () {
          killAll(tree, signal);
        }
      );
      break;
    default: // Linux
      buildProcessTree(
        pid,
        tree,
        pidsToProcess,
        function (parentPid: any) {
          return spawn('ps', [
            '-o',
            'pid',
            '--no-headers',
            '--ppid',
            parentPid,
          ]);
        },
        function () {
          killAll(tree, signal);
        }
      );
      break;
  }
}

function killAll(tree: any, signal: any) {
  const killed: any = {};

  Object.keys(tree).forEach(function (pid) {
    tree[pid].forEach(function (pidpid: any) {
      if (!killed[pidpid]) {
        killPid(pidpid, signal);
        killed[pidpid] = 1;
      }
    });
    if (!killed[pid]) {
      killPid(pid, signal);
      killed[pid] = 1;
    }
  });
}

function killPid(pid: any, signal: any) {
  try {
    process.kill(parseInt(pid, 10), signal);
  } catch (err: any) {
    if (err.code !== 'ESRCH') throw err;
  }
}

function buildProcessTree(
  parentPid: any,
  tree: any,
  pidsToProcess: any,
  spawnChildProcessesList: any,
  cb: any
) {
  const ps = spawnChildProcessesList(parentPid);
  let allData = '';
  ps.stdout.on('data', function (_data: any) {
    const data = _data.toString('ascii');
    allData += data;
  });

  const onClose = function (code: any) {
    delete pidsToProcess[parentPid];

    if (code != 0) {
      // no more parent processes
      if (Object.keys(pidsToProcess).length == 0) {
        cb();
      }
      return;
    }

    allData.match(/\d+/g)?.forEach(function (pid: any) {
      pid = parseInt(pid, 10);
      tree[parentPid].push(pid);
      tree[pid] = [];
      pidsToProcess[pid] = 1;
      buildProcessTree(pid, tree, pidsToProcess, spawnChildProcessesList, cb);
    });
  };

  ps.on('close', onClose);
}
