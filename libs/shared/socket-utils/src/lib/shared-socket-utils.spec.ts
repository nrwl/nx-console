import * as fs from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

jest.mock('@nx-console/shared-npm', () => ({
  importNxPackagePath: jest.fn(async () => ({
    hashArray: (input: Array<string | undefined | null>) =>
      jest
        .requireActual('crypto')
        .createHash('sha1')
        .update(input.join(','))
        .digest('hex')
        .slice(0, 16),
  })),
}));

jest.mock('os', () => {
  const actual = jest.requireActual('os');
  return {
    ...actual,
    platform: jest.fn(() => actual.platform()),
  };
});

// fs exports are non-configurable on modern Node, so jest.spyOn cannot wrap
// them. Mock the module instead, keeping the real implementations.
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    mkdirSync: jest.fn(actual.mkdirSync),
    chmodSync: jest.fn(actual.chmodSync),
  };
});

const mockedPlatform = jest.requireMock('os').platform as jest.Mock;
const mockedMkdirSync = fs.mkdirSync as unknown as jest.Mock;
const mockedChmodSync = fs.chmodSync as unknown as jest.Mock;

import { getNxConsoleSocketPath } from './shared-socket-utils';

const actualPlatform = jest.requireActual('os').platform();
const describeOnPosix = actualPlatform === 'win32' ? describe.skip : describe;

const MODE_MASK = 0o777;

function modeOf(path: string): number {
  return jest.requireActual('fs').statSync(path).mode & MODE_MASK;
}

describe('shared-socket-utils', () => {
  const realFs = jest.requireActual('fs');
  const tmpDirs: string[] = [];

  function makeTmpDir(prefix = 'nxc-ws-'): string {
    const dir = realFs.mkdtempSync(join(tmpdir(), prefix));
    tmpDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    jest.clearAllMocks();
    mockedPlatform.mockImplementation(() => actualPlatform);
  });

  afterAll(() => {
    for (const dir of tmpDirs) {
      realFs.rmSync(dir, { recursive: true, force: true });
    }
  });

  describeOnPosix('socket directory permissions', () => {
    it('creates the socket directory owner-only (0700)', async () => {
      const workspaceRoot = makeTmpDir();
      const socketDir = join(makeTmpDir('nxc-sock-'), 'nested');

      const socketPath = await getNxConsoleSocketPath(workspaceRoot, {
        NX_SOCKET_DIR: socketDir,
      });

      expect(dirname(socketPath)).toEqual(socketDir);
      expect(realFs.existsSync(socketDir)).toBe(true);
      expect(modeOf(socketDir)).toEqual(0o700);
    });

    it('creates the hashed default socket directory owner-only (0700)', async () => {
      const workspaceRoot = makeTmpDir();

      const socketPath = await getNxConsoleSocketPath(workspaceRoot, {});

      const socketDir = dirname(socketPath);
      tmpDirs.push(socketDir);
      expect(modeOf(socketDir)).toEqual(0o700);
    });

    // mkdirSync's `mode` is masked by the umask and only applies to directories
    // it actually creates, so a directory left at 0755 by an older version would
    // otherwise stay 0755 forever - and Nx would refuse it.
    it('tightens a pre-existing group/world-readable directory to 0700', async () => {
      const workspaceRoot = makeTmpDir();
      const socketDir = join(makeTmpDir('nxc-sock-'), 'nested');
      realFs.mkdirSync(socketDir, { recursive: true });
      realFs.chmodSync(socketDir, 0o755);
      expect(modeOf(socketDir)).toEqual(0o755);

      await getNxConsoleSocketPath(workspaceRoot, {
        NX_SOCKET_DIR: socketDir,
      });

      expect(modeOf(socketDir)).toEqual(0o700);
      expect(mockedChmodSync).toHaveBeenCalledWith(socketDir, 0o700);
    });

    it('leaves an already-0700 directory untouched', async () => {
      const workspaceRoot = makeTmpDir();
      const socketDir = join(makeTmpDir('nxc-sock-'), 'nested');
      realFs.mkdirSync(socketDir, { recursive: true });
      realFs.chmodSync(socketDir, 0o700);

      await getNxConsoleSocketPath(workspaceRoot, {
        NX_SOCKET_DIR: socketDir,
      });

      expect(mockedChmodSync).not.toHaveBeenCalled();
      expect(modeOf(socketDir)).toEqual(0o700);
    });

    // chmod follows symlinks, so re-permissioning through one would silently
    // change a directory we were never pointed at.
    it('does not chmod through a symlinked socket directory', async () => {
      const workspaceRoot = makeTmpDir();
      const realDir = join(makeTmpDir('nxc-sock-'), 'real');
      realFs.mkdirSync(realDir, { recursive: true });
      realFs.chmodSync(realDir, 0o755);
      const linkDir = join(makeTmpDir('nxc-link-'), 'link');
      realFs.symlinkSync(realDir, linkDir);

      await getNxConsoleSocketPath(workspaceRoot, {
        NX_SOCKET_DIR: linkDir,
      });

      expect(mockedChmodSync).not.toHaveBeenCalled();
      expect(modeOf(realDir)).toEqual(0o755);
    });
  });

  describe('windows named pipes', () => {
    it('returns a named pipe and never touches directory permissions', async () => {
      mockedPlatform.mockReturnValue('win32');
      const workspaceRoot = makeTmpDir();
      const socketDir = join(makeTmpDir('nxc-sock-'), 'never-created');

      const socketPath = await getNxConsoleSocketPath(workspaceRoot, {
        NX_SOCKET_DIR: socketDir,
      });

      expect(socketPath.startsWith('\\\\.\\pipe\\nx\\')).toBe(true);
      expect(socketPath).toContain('nx-console.sock');
      expect(mockedMkdirSync).not.toHaveBeenCalled();
      expect(mockedChmodSync).not.toHaveBeenCalled();
      expect(realFs.existsSync(socketDir)).toBe(false);
    });
  });

  describe('socket dir environment variables', () => {
    it('honours NX_SOCKET_DIR', async () => {
      const workspaceRoot = makeTmpDir();
      const socketDir = makeTmpDir('nxc-sock-');

      const socketPath = await getNxConsoleSocketPath(workspaceRoot, {
        NX_SOCKET_DIR: socketDir,
      });

      expect(socketPath).toEqual(join(socketDir, 'nx-console.sock'));
    });

    it('honours NX_DAEMON_SOCKET_DIR when NX_SOCKET_DIR is unset', async () => {
      const workspaceRoot = makeTmpDir();
      const socketDir = makeTmpDir('nxc-sock-');

      const socketPath = await getNxConsoleSocketPath(workspaceRoot, {
        NX_DAEMON_SOCKET_DIR: socketDir,
      });

      expect(socketPath).toEqual(join(socketDir, 'nx-console.sock'));
    });

    it('prefers NX_SOCKET_DIR over NX_DAEMON_SOCKET_DIR', async () => {
      const workspaceRoot = makeTmpDir();
      const preferred = makeTmpDir('nxc-sock-');
      const ignored = makeTmpDir('nxc-sock-');

      const socketPath = await getNxConsoleSocketPath(workspaceRoot, {
        NX_SOCKET_DIR: preferred,
        NX_DAEMON_SOCKET_DIR: ignored,
      });

      expect(socketPath).toEqual(join(preferred, 'nx-console.sock'));
    });

    it('resolves a relative NX_SOCKET_DIR against the workspace root', async () => {
      const workspaceRoot = makeTmpDir();

      const socketPath = await getNxConsoleSocketPath(workspaceRoot, {
        NX_SOCKET_DIR: 'tmp/sockets',
      });

      expect(socketPath).toEqual(
        join(workspaceRoot, 'tmp', 'sockets', 'nx-console.sock'),
      );
    });

    it('returns a stable path across calls for the same workspace root', async () => {
      const workspaceRoot = makeTmpDir();

      const first = await getNxConsoleSocketPath(workspaceRoot, {});
      const second = await getNxConsoleSocketPath(workspaceRoot, {});

      tmpDirs.push(dirname(first));
      expect(first).toEqual(second);
    });

    it('derives different paths for different workspace roots', async () => {
      const first = await getNxConsoleSocketPath(makeTmpDir(), {});
      const second = await getNxConsoleSocketPath(makeTmpDir(), {});

      tmpDirs.push(dirname(first), dirname(second));
      expect(first).not.toEqual(second);
    });
  });
});
