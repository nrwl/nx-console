import { mkdirSync, unlinkSync } from 'fs';
import { platform, tmpdir } from 'os';
import { join, resolve } from 'path';
import { importNxPackagePath } from '@nx-console/shared-npm';

const DAEMON_DIR_FOR_CURRENT_WORKSPACE = join('.nx', 'workspace-data', 'd');

async function socketDirName(workspaceRoot: string): Promise<string> {
  const { hashArray } = await importNxPackagePath<
    typeof import('nx/src/native')
  >(workspaceRoot, 'src/native');
  const unique = hashArray([workspaceRoot, 'nx-console']);
  return join(tmpdir(), unique);
}

async function getSocketDir(workspaceRoot: string) {
  try {
    const dir =
      process.env.NX_SOCKET_DIR ??
      process.env.NX_DAEMON_SOCKET_DIR ??
      (await socketDirName(workspaceRoot));
    if (platform() !== 'win32') {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  } catch (e) {
    return join(workspaceRoot, DAEMON_DIR_FOR_CURRENT_WORKSPACE);
  }
}

export const getFullOsSocketPath = async (workspaceRoot: string) => {
  const path = resolve(
    join(await getSocketDir(workspaceRoot), 'nx-console.sock'),
  );
  return platform() === 'win32' ? '\\\\.\\pipe\\nx\\' + path : path;
};

export async function killSocketOnPath(socketPath: string): Promise<void> {
  if (platform() == 'win32') {
    return;
  }
  try {
    unlinkSync(socketPath);
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error('Error removing existing socket file:', error);
    }
  }
}
