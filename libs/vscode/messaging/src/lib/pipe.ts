import { createHash } from 'crypto';
import { mkdirSync, unlinkSync } from 'fs';
import { platform, tmpdir } from 'os';
import { join, resolve } from 'path';

// todo(cammisuli): use the workspace data dir from libs/shared/npm/src/lib/local-nx-utils/cache-dir.ts in #2456
const DAEMON_DIR_FOR_CURRENT_WORKSPACE = join('.', 'd');

function socketDirName(workspaceRoot: string): string {
  const hasher = createHash('sha256');
  hasher.update(workspaceRoot.toLowerCase());
  const unique = hasher.digest('hex').substring(0, 20);
  return join(tmpdir(), unique);
}

function getSocketDir(workspaceRoot: string) {
  try {
    const dir =
      process.env.NX_SOCKET_DIR ??
      process.env.NX_DAEMON_SOCKET_DIR ??
      socketDirName(workspaceRoot);
    mkdirSync(dir, { recursive: true });

    return dir;
  } catch (e) {
    return DAEMON_DIR_FOR_CURRENT_WORKSPACE;
  }
}

export const getFullOsSocketPath = (workspaceRoot: string) => {
  const path = resolve(join(getSocketDir(workspaceRoot), 'nx-console.sock'));
  return platform() === 'win32' ? '\\\\.\\pipe\\nx\\' + path : path;
};

export function killSocketOrPath(workspaceRoot: string): void {
  if (platform() == 'win32') {
    return;
  }
  const socketPath = getFullOsSocketPath(workspaceRoot);
  try {
    unlinkSync(socketPath);
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error('Error removing existing socket file:', error);
    }
  }
}
