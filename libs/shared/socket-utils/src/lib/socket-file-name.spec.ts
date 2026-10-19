import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { basename, join } from 'path';
import { getNxConsoleSocketPath } from './shared-socket-utils';

describe('socket file name', () => {
  const dirs: string[] = [];

  afterAll(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('names the socket file nx-console.socket', async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'nxc-ws-'));
    const socketDir = mkdtempSync(join(tmpdir(), 'nxc-sock-'));
    dirs.push(workspaceRoot, socketDir);

    const socketPath = await getNxConsoleSocketPath(workspaceRoot, {
      NX_SOCKET_DIR: socketDir,
    });

    expect(basename(socketPath)).toBe('nx-console.socket');
  });
});
