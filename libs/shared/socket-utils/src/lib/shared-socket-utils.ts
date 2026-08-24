import { importNxPackagePath } from '@nx-console/shared-npm';
import { consoleLogger } from '@nx-console/shared-utils';
import { chmodSync, lstatSync, mkdirSync, unlinkSync } from 'fs';
import { Socket } from 'net';
import { platform, tmpdir } from 'os';
import { join, resolve } from 'path';

const DAEMON_DIR_FOR_CURRENT_WORKSPACE = join('.nx', 'workspace-data', 'd');

const OWNER_ONLY_DIR_MODE = 0o700;

async function socketDirName(workspaceRoot: string): Promise<string> {
  const { hashArray } = await importNxPackagePath<
    typeof import('nx/src/native')
  >(workspaceRoot, 'src/native');
  const unique = hashArray([workspaceRoot.toLowerCase(), 'nx-console']);
  return join(tmpdir(), unique);
}

/**
 * Nx refuses a socket root that it does not own or that is group/world
 * accessible, and silently falls back to a different root when it finds one.
 * Since Nx Console binds the socket and Nx connects to it, Nx Console is
 * normally the process that creates this directory - so it has to create it the
 * way Nx expects, or the two ends end up on different paths.
 *
 * `mkdirSync`'s `mode` is masked by the process umask and is only applied to
 * directories it actually creates, so it is not enough on its own: a directory
 * left at 0755 by an earlier version keeps that mode forever. Re-assert the mode
 * explicitly whenever the directory is ours to change.
 */
function ensureOwnedPrivateDir(dir: string) {
  mkdirSync(dir, { recursive: true, mode: OWNER_ONLY_DIR_MODE });

  const stats = lstatSync(dir);

  // chmod follows symlinks, and a directory owned by someone else is not ours
  // to re-permission (the call would fail anyway). In both cases Nx may well
  // refuse the directory, so make the reason visible instead of failing later
  // as a mysterious "no IDE detected".
  if (stats.isSymbolicLink()) {
    consoleLogger.log(
      `Socket dir ${dir} is a symlink, leaving its permissions alone. Nx may refuse to use it.`,
    );
    return;
  }
  if (typeof process.getuid !== 'function') {
    return;
  }
  if (stats.uid !== process.getuid()) {
    consoleLogger.log(
      `Socket dir ${dir} is not owned by the current user, leaving its permissions alone. Nx may refuse to use it.`,
    );
    return;
  }

  if ((stats.mode & 0o777) === OWNER_ONLY_DIR_MODE) {
    return;
  }

  chmodSync(dir, OWNER_ONLY_DIR_MODE);

  // Read the mode back rather than trusting chmod's return, the way Nx does:
  // filesystems that ignore modes report success and change nothing, and the
  // resulting mismatch would otherwise only surface as Nx quietly using a
  // different socket root.
  if ((lstatSync(dir).mode & 0o777) !== OWNER_ONLY_DIR_MODE) {
    consoleLogger.log(
      `Could not restrict socket dir ${dir} to 0700. Nx may refuse to use it.`,
    );
  }
}

async function getSocketDir(workspaceRoot: string, env: NodeJS.ProcessEnv) {
  try {
    const dir = resolve(
      workspaceRoot,
      env.NX_SOCKET_DIR ??
        env.NX_DAEMON_SOCKET_DIR ??
        (await socketDirName(workspaceRoot)),
    );

    if (platform() !== 'win32') {
      ensureOwnedPrivateDir(dir);
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
export const getNxConsoleSocketPath = async (
  workspaceRoot: string,
  env = process.env,
) => {
  const path = resolve(
    join(await getSocketDir(workspaceRoot, env), 'nx-console.sock'),
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
