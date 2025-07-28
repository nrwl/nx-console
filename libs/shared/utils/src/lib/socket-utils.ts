import { mkdirSync, unlinkSync } from 'fs';
import { access, constants } from 'fs/promises';
import { platform, tmpdir } from 'os';
import { join, resolve } from 'path';
import { createHash } from 'crypto';
import { Socket } from 'net';
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
    if (platform() !== 'win32') {
      mkdirSync(dir, { recursive: true });
    }
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

/**
 * Test if a socket connection can be established
 */
export async function testSocketConnection(
  socketPath: string,
): Promise<boolean> {
  try {
    // On Windows, we can't easily test named pipe existence
    if (platform() === 'win32') {
      // For Windows named pipes, we'll assume available if the path format is correct
      return socketPath.startsWith('\\\\.\\pipe\\');
    }

    // On Unix, check if socket file exists and is accessible
    await access(socketPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Test if an IDE is actually listening on the socket
 */
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

/**
 * Detect if Nx Console socket exists and is accessible
 */
export async function detectNxConsoleSocket(
  workspacePath: string,
): Promise<boolean> {
  try {
    const socketPath = getNxConsoleSocketPath(workspacePath);
    return await testSocketConnection(socketPath);
  } catch {
    return false;
  }
}
