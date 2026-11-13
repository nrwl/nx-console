import { getNxWorkspace } from '@nx-console/vscode-nx-workspace';
import { getNxExecutionCommand } from '@nx-console/shared-npm';
import { vscodeLogger } from '@nx-console/vscode-output-channels';
import { selectFlags } from './select-flags';
import { env, window } from 'vscode';

jest.mock('@nx-console/vscode-output-channels', () => ({
  vscodeLogger: { log: jest.fn() },
}));

jest.mock('@nx-console/shared-npm', () => ({
  getNxExecutionCommand: jest.fn(
    async ({ displayCommand }) => `npx ${displayCommand}`,
  ),
}));
jest.mock('@nx-console/vscode-nx-workspace', () => ({
  getNxWorkspace: jest.fn(async () => ({
    workspacePath: '/workspace',
    isEncapsulatedNx: false,
  })),
}));
jest.mock('@nx-console/vscode-utils', () => ({
  splitCommandLine: jest.fn((text: string) => text.split(' ')),
}));
jest.mock(
  'vscode',
  () => ({
    env: { clipboard: { writeText: jest.fn(async () => undefined) } },
    window: {
      createQuickPick: jest.fn(),
      showInputBox: jest.fn(),
      showInformationMessage: jest.fn(),
    },
    ThemeIcon: class {
      constructor(readonly id: string) {}
    },
  }),
  { virtual: true },
);

function picker() {
  let accept: () => void;
  let hide: () => void;
  let button: (event: { item: unknown }) => Promise<void>;
  const disposables: { dispose: jest.Mock }[] = [];
  const subscribe = (callback: () => void) => {
    callback();
    const disposable = { dispose: jest.fn() };
    disposables.push(disposable);
    return disposable;
  };
  const quickPick = {
    items: [] as any[],
    selectedItems: [] as any[],
    onDidAccept: (listener: () => void) =>
      subscribe(() => {
        accept = listener;
      }),
    onDidHide: (listener: () => void) =>
      subscribe(() => {
        hide = listener;
      }),
    onDidTriggerItemButton: (listener: typeof button) =>
      subscribe(() => {
        button = listener;
      }),
    show: jest.fn(),
    hide: () => hide(),
    dispose: jest.fn(),
  };
  (window.createQuickPick as jest.Mock).mockReturnValueOnce(quickPick);
  return {
    quickPick,
    disposables,
    accept: () => accept(),
    hide: () => hide(),
    copy: () => button({ item: quickPick.items[0] }),
  };
}

async function shown(quickPick: ReturnType<typeof picker>['quickPick']) {
  for (let i = 0; i < 10 && !quickPick.show.mock.calls.length; i++)
    await Promise.resolve();
  expect(quickPick.show).toHaveBeenCalled();
}

describe('selectFlags', () => {
  beforeEach(() => jest.clearAllMocks());

  it('copies without accepting and allows executing afterwards', async () => {
    const p = picker();
    const result = selectFlags('run app:build', [], {
      configuration: 'production',
    });
    await shown(p.quickPick);
    expect(p.quickPick.items[0].label).toBe(
      'Execute: nx run app:build --configuration=production',
    );
    expect(getNxWorkspace).not.toHaveBeenCalled();
    expect(getNxExecutionCommand).not.toHaveBeenCalled();
    await p.copy();
    expect(env.clipboard.writeText).toHaveBeenCalledWith(
      'npx nx run app:build --configuration=production',
    );
    expect(p.quickPick.dispose).not.toHaveBeenCalled();
    expect(window.showInformationMessage).toHaveBeenCalledWith(
      'Command copied to clipboard',
    );
    p.quickPick.selectedItems = [p.quickPick.items[0]];
    p.accept();
    expect(await result).toEqual(['--configuration=production']);
    expect(p.quickPick.dispose).toHaveBeenCalledTimes(1);
    p.disposables.forEach((d) => expect(d.dispose).toHaveBeenCalledTimes(1));
  });

  it('returns undefined when the picker is dismissed', async () => {
    const p = picker();
    const result = selectFlags('run-many', []);
    await shown(p.quickPick);
    p.hide();
    expect(await result).toBeUndefined();
    expect(env.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('sets a flag and returns to a fresh picker', async () => {
    const first = picker();
    const second = picker();
    (window.showInputBox as jest.Mock).mockResolvedValueOnce('two words');
    const result = selectFlags('affected', [
      { name: 'base', type: 'string', aliases: [], isRequired: false },
    ]);
    await shown(first.quickPick);
    first.quickPick.selectedItems = [first.quickPick.items[1]];
    first.accept();
    await shown(second.quickPick);
    expect(second.quickPick.items[0].label).toBe(
      'Execute: nx affected --base=two words',
    );
    second.quickPick.selectedItems = [second.quickPick.items[0]];
    second.accept();
    expect(await result).toEqual(['--base=two words']);
  });
  it('copies a quoted Nx command when no workspace is available', async () => {
    jest.mocked(getNxWorkspace).mockResolvedValueOnce(undefined);
    const p = picker();
    const result = selectFlags('run app:build', [], { note: 'two words' });
    await shown(p.quickPick);
    await p.copy();
    expect(env.clipboard.writeText).toHaveBeenCalledWith(
      'nx run app:build "--note=two words"',
    );
    expect(getNxExecutionCommand).not.toHaveBeenCalled();
    p.quickPick.selectedItems = [p.quickPick.items[0]];
    p.accept();
    expect(await result).toEqual(['--note=two words']);
  });

  it.each(['workspace', 'execution', 'clipboard'])(
    'handles a rejected %s promise without closing the picker',
    async (source) => {
      const error = new Error('copy failed');
      const operation =
        source === 'workspace'
          ? getNxWorkspace
          : source === 'execution'
            ? getNxExecutionCommand
            : env.clipboard.writeText;
      jest.mocked(operation).mockRejectedValueOnce(error);
      const p = picker();
      const result = selectFlags('run app:build', []);
      await shown(p.quickPick);
      await expect(p.copy()).resolves.toBeUndefined();
      expect(vscodeLogger.log).toHaveBeenCalledWith(
        `Unable to copy command: ${error}`,
      );
      expect(window.showInformationMessage).not.toHaveBeenCalled();
      expect(p.quickPick.dispose).not.toHaveBeenCalled();
      p.hide();
      expect(await result).toBeUndefined();
    },
  );
});
