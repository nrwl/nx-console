import { ShellExecution, ShellQuoting, tasks, window } from 'vscode';
import { applyFixLocallyWithNxCloud } from './apply-fix-locally';
import { handleSelfHealingUri } from './self-healing-uri-handler';

const CLOUD_ID = 'cloud-id-123';
const WORKSPACE_PATH = '/workspace';

jest.mock('vscode', () => {
  class ShellExecution {
    constructor(
      public command: unknown,
      public args?: unknown,
      public options?: unknown,
    ) {
      if (!Array.isArray(args)) {
        this.options = args;
        this.args = undefined;
      }
    }
  }
  class Task {
    constructor(
      public definition: unknown,
      public scope: unknown,
      public name: string,
      public source: string,
      public execution: unknown,
    ) {}
  }
  const endListeners: ((e: unknown) => void)[] = [];
  return {
    ShellExecution,
    Task,
    TaskScope: { Workspace: 2 },
    ShellQuoting: { Escape: 1, Strong: 2, Weak: 3 },
    window: { showErrorMessage: jest.fn() },
    workspace: {
      workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
      getConfiguration: () => ({ get: () => undefined }),
    },
    env: { sessionId: 'session', clipboard: { writeText: jest.fn() } },
    tasks: {
      onDidEndTaskProcess: (listener: (e: unknown) => void) => {
        endListeners.push(listener);
        return { dispose: jest.fn() };
      },
      executeTask: jest.fn(async (task: unknown) => {
        for (const listener of endListeners.splice(0)) {
          listener({ execution: { task }, exitCode: 0 });
        }
      }),
    },
  };
});

jest.mock('@nx-console/vscode-utils', () => ({
  getShellExecutionForConfig: jest.requireActual(
    '@nx-console/vscode-utils/src/lib/shell-execution',
  ).getShellExecutionForConfig,
  getGitRepository: jest.fn(),
}));

jest.mock('@nx-console/shared-npm', () => ({
  getPackageManagerCommand: jest.fn().mockResolvedValue({ exec: 'pnpm exec' }),
}));

jest.mock('@nx-console/vscode-nx-workspace', () => ({
  getNxWorkspace: jest.fn().mockResolvedValue({
    isEncapsulatedNx: false,
    workspacePath: '/workspace',
  }),
}));

jest.mock('@nx-console/shared-nx-cloud', () => ({
  getNxCloudId: jest.fn().mockResolvedValue('cloud-id-123'),
}));

jest.mock('@nx-console/vscode-output-channels', () => ({
  vscodeLogger: { log: jest.fn() },
}));

jest.mock('@nx-console/vscode-telemetry', () => ({
  getTelemetry: () => ({ logUsage: jest.fn() }),
}));

jest.mock('./ai-fix-status-bar-service', () => ({
  getAiFixStatusBarService: () => ({ hideAiFixStatusBarItem: jest.fn() }),
}));

function selfHealingUri(fixId: string) {
  const path = `/self-healing/${CLOUD_ID}/${fixId}`;
  return { path, toString: () => `vscode://nrwl.angular-console${path}` };
}

function executedShellExecution(): ShellExecution {
  const [task] = jest.mocked(tasks.executeTask).mock.calls[0];
  return task.execution as ShellExecution;
}

describe('handleSelfHealingUri', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs nx-cloud apply-locally with the fix id as a strongly quoted argument', async () => {
    await handleSelfHealingUri(selfHealingUri('aBc12-XyZ_9') as never);

    const execution = executedShellExecution();
    expect(execution.command).toBe('pnpm');
    expect(execution.args).toEqual([
      'exec',
      'nx-cloud',
      'apply-locally',
      { value: 'aBc12-XyZ_9', quoting: ShellQuoting.Strong },
    ]);
    expect(execution.options).toMatchObject({ cwd: WORKSPACE_PATH });
    expect(window.showErrorMessage).not.toHaveBeenCalled();
  });

  it.each([
    'abc-def$(touch pwned)',
    'abc-def;touch pwned',
    'abc-def`touch pwned`',
    'abc-def|sh',
    'abc-def&calc',
    'abc def',
    "abc-def'",
    'abc-def"',
    'abc-def%PATH%',
    '--help',
  ])('does not run anything for the fix id %p', async (fixId) => {
    await handleSelfHealingUri(selfHealingUri(fixId) as never);

    expect(tasks.executeTask).not.toHaveBeenCalled();
    expect(window.showErrorMessage).toHaveBeenCalledWith(
      'Invalid self-healing URI format',
    );
  });
});

describe('applyFixLocallyWithNxCloud', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refuses a short link from Nx Cloud that contains shell syntax', async () => {
    await applyFixLocallyWithNxCloud('abc-def$(touch pwned)');

    expect(tasks.executeTask).not.toHaveBeenCalled();
    expect(window.showErrorMessage).toHaveBeenCalledWith(
      'Failed to apply fix: invalid Nx Cloud fix id.',
    );
  });
});
