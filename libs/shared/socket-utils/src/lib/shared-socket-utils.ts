import { importNxPackagePath } from '@nx-console/shared-npm';
import { consoleLogger } from '@nx-console/shared-utils';
import { mkdirSync, unlinkSync } from 'fs';
import { Socket } from 'net';
import { platform, tmpdir } from 'os';
import { join, resolve } from 'path';

const DAEMON_DIR_FOR_CURRENT_WORKSPACE = join('.nx', 'workspace-data', 'd');

async function socketDirName(workspaceRoot: string): Promise<string> {
  const { hashArray } = await importNxPackagePath<
    typeof import('nx/src/native')
  >(workspaceRoot, 'src/native');
  const unique = hashArray([workspaceRoot.toLowerCase(), 'nx-console']);
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
    consoleLogger.log('Error getting socket dir:', e);
    return join(workspaceRoot, DAEMON_DIR_FOR_CURRENT_WORKSPACE);
  }
}

/**
 * Get the full OS-specific socket path for Nx Console communication
 */
export const getNxConsoleSocketPath = async (workspaceRoot: string) => {
  const path = resolve(
    join(await getSocketDir(workspaceRoot), 'nx-console.sock'),
  );
  return platform() === 'win32' ? '\\\\.\\pipe\\nx\\' + path : path;
};

/**
 * Remove socket file from filesystem (Unix only)
 */
export async function killSocketOnPath(socketPath: string): Promise<void> {
  if (platform() == 'win32') {
    return;
  }
  try {
    unlinkSync(socketPath);
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      consoleLogger.log('Error removing existing socket file:', error);
    }
  }
}

export async function testIdeConnection(
  workspacePath: string,
): Promise<boolean> {
  const socketPath = await getNxConsoleSocketPath(workspacePath);
  return new Promise((resolve) => {
    const socket = new Socket();

    // Set a timeout for the connection attempt
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 1000);

    socket.once('connect', () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(true);
    });

    socket.once('error', () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(false);
    });

    // Attempt to connect
    socket.connect(socketPath);
  });
}
