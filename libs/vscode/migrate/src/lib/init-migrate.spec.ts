import { execFile } from 'child_process';
import { promisify } from 'util';
import { commands } from 'vscode';
import { initMigrate } from './init-migrate';

jest.mock('child_process', () => {
  const execFile = jest.fn();
  const { promisify } = jest.requireActual('util');
  Object.defineProperty(execFile, promisify.custom, { value: jest.fn() });
  return {
    execFile,
    execSync: jest.fn(() => Buffer.from('')),
  };
});
jest.mock(
  'vscode',
  () => ({
    commands: { executeCommand: jest.fn(), registerCommand: jest.fn() },
    window: { registerTerminalLinkProvider: jest.fn() },
  }),
  { virtual: true },
);
jest.mock('xstate', () => ({
  createActor: () => mockActor,
}));
jest.mock('@nx-console/language-server-types', () => ({
  NxWorkspaceRefreshStartedNotification: {},
}));
jest.mock('@nx-console/vscode-configuration', () => ({
  getNxWorkspacePath: () => '/workspace',
}));
jest.mock('@nx-console/vscode-lsp-client', () => ({
  getNxlsClient: () => ({ onNotification: () => ({ dispose: jest.fn() }) }),
  onWorkspaceRefreshed: () => ({ dispose: jest.fn() }),
}));
jest.mock('@nx-console/vscode-nx-workspace', () => ({
  getNxVersion: async () => '20.0.0',
}));
jest.mock('@nx-console/vscode-output-channels', () => ({
  vscodeLogger: { log: jest.fn() },
}));
jest.mock('@nx-console/shared-utils', () => ({
  httpRequest: async () => ({ responseText: '{}' }),
}));
jest.mock('@nx-console/vscode-utils', () => ({
  watchFile: jest.fn(),
}));
jest.mock('./commands/migrate-commands', () => ({
  registerCommands: jest.fn(),
}));
jest.mock('./diff-editor-terminal-link-provider', () => ({
  DiffEditorTerminalLinkProvider: class {},
}));
jest.mock('./migrate-sidebar-view-provider', () => ({
  MigrateSidebarViewProvider: { create: () => mockSidebar },
}));
jest.mock('./migrate-state-machine', () => ({
  migrateMachine: {},
}));
jest.mock('./migrate-webview', () => ({
  MigrateWebview: class {
    refresh = jest.fn();
  },
}));

let currentState = 'update-available';
const mockSidebar = { visible: true };
const mockActor = {
  start: jest.fn(),
  getSnapshot: () => ({ matches: (state: string) => state === currentState }),
  subscribe: () => ({ unsubscribe: jest.fn() }),
  send: jest.fn(),
};
const execFileAsyncMock = (execFile as any)[promisify.custom] as jest.Mock;
const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('initMigrate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSidebar.visible = true;
    currentState = 'update-available';
  });

  it('reads git status without taking the index lock', async () => {
    currentState = 'update-available';
    execFileAsyncMock.mockResolvedValue({
      stdout: ' M src/index.ts\n',
      stderr: '',
    });

    initMigrate({ subscriptions: [] } as any);
    await flushPromises();

    expect(execFileAsyncMock).toHaveBeenCalledWith(
      'git',
      ['status', '--porcelain'],
      expect.objectContaining({
        cwd: '/workspace',
        env: expect.objectContaining({ GIT_OPTIONAL_LOCKS: '0' }),
      }),
    );
    expect(mockActor.send).toHaveBeenCalledWith(
      expect.objectContaining({
        value: expect.objectContaining({ hasPendingChanges: true }),
      }),
    );
  });

  it('skips git status when no update is available', async () => {
    currentState = 'default';

    initMigrate({ subscriptions: [] } as any);
    await flushPromises();

    expect(execFileAsyncMock).not.toHaveBeenCalled();
  });

  it('skips git status when the migrate sidebar is hidden', async () => {
    currentState = 'update-available';
    mockSidebar.visible = false;

    initMigrate({ subscriptions: [] } as any);
    await flushPromises();

    expect(execFileAsyncMock).not.toHaveBeenCalled();
    mockSidebar.visible = true;
  });
  it.each(['hidden', 'no-update'])(
    'skips a queued check when %s after enqueueing',
    async (reason) => {
      let finish!: (value: { stdout: string }) => void;
      execFileAsyncMock.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      );
      execFileAsyncMock.mockResolvedValue({ stdout: '' });
      initMigrate({ subscriptions: [] } as any);
      await flushPromises();
      const refresh = (commands.registerCommand as jest.Mock).mock.calls.find(
        ([name]) => name === 'nxMigrate.refresh',
      )[1];
      refresh();
      if (reason === 'hidden') mockSidebar.visible = false;
      else currentState = 'default';
      finish({ stdout: '' });
      await flushPromises();
      expect(execFileAsyncMock).toHaveBeenCalledTimes(1);
    },
  );

  it('allows migration after a failed git check and keeps the queue usable', async () => {
    execFileAsyncMock.mockRejectedValueOnce(new Error('not a git repository'));
    execFileAsyncMock.mockResolvedValue({ stdout: ' M file' });
    initMigrate({ subscriptions: [] } as any);
    await flushPromises();
    expect(mockActor.send).toHaveBeenCalledWith({
      type: 'UPDATE_VIEW_DATA',
      value: { hasPendingChanges: false },
    });
    const refresh = (commands.registerCommand as jest.Mock).mock.calls.find(
      ([name]) => name === 'nxMigrate.refresh',
    )[1];
    refresh();
    await flushPromises();
    expect(mockActor.send).toHaveBeenCalledWith({
      type: 'UPDATE_VIEW_DATA',
      value: { hasPendingChanges: true },
    });
  });
});
