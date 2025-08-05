import { createHash } from 'crypto';
import { mkdirSync, unlinkSync } from 'fs';
import { Socket } from 'net';
import { platform, tmpdir } from 'os';
import { join, resolve } from 'path';
import { consoleLogger } from './logger';

const DAEMON_DIR_FOR_CURRENT_WORKSPACE = join('.nx', 'workspace-data', 'd');

function createSimpleHash(input: string): string {
  return createHash('sha256').update(input).digest('hex').substring(0, 16);
}

function socketDirName(workspaceRoot: string): string {
  const unique = createSimpleHash(workspaceRoot.toLowerCase() + 'nx-console');
  return join(tmpdir(), unique);
}

function getSocketDir(workspaceRoot: string): string {
  try {
    const dir =
      process.env.NX_SOCKET_DIR ??
      process.env.NX_DAEMON_SOCKET_DIR ??
      socketDirName(workspaceRoot);
    mkdirSync(dir, { recursive: true });

    return dir;
  } catch (e) {
    return join(workspaceRoot, DAEMON_DIR_FOR_CURRENT_WORKSPACE);
  }
}

/**
 * Get the full OS-specific socket path for Nx Console communication
 */
export const getNxConsoleSocketPath = (workspaceRoot: string): string => {
  const path = resolve(join(getSocketDir(workspaceRoot), 'nx-console.sock'));
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
  return new Promise((resolve) => {
    const socketPath = getNxConsoleSocketPath(workspacePath);
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
