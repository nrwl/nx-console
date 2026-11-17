import { execFileSync, execSync } from 'child_process';
import { window } from 'vscode';
import { cancelMigration } from './migrate-commands';
import { readMigrationsJsonMetadata } from './utils';

jest.mock('child_process', () => ({
  execFileSync: jest.fn(),
  execSync: jest.fn(),
}));
jest.mock(
  'vscode',
  () => ({
    commands: { executeCommand: jest.fn(), registerCommand: jest.fn() },
    window: {
      showErrorMessage: jest.fn(),
      showWarningMessage: jest.fn(),
      withProgress: jest.fn(),
    },
    workspace: {},
    ProgressLocation: { Notification: 15 },
  }),
  { virtual: true },
);
jest.mock('@nx-console/shared-npm', () => ({
  getPackageManagerCommand: async () => ({ install: 'npm install' }),
}));
jest.mock('@nx-console/vscode-configuration', () => ({
  getNxWorkspacePath: () => '/workspace',
}));
jest.mock('@nx-console/vscode-output-channels', () => ({
  logAndShowError: jest.fn(),
}));
jest.mock('@nx-console/vscode-utils', () => ({
  getGitApi: jest.fn(),
}));
jest.mock('../git-extension/view-diff', () => ({
  viewPackageJsonDiff: jest.fn(),
}));
jest.mock('../migrate-webview', () => ({}));
jest.mock('./start-migration', () => ({ startMigration: jest.fn() }));
jest.mock('./utils', () => ({
  importMigrateUIApi: jest.fn(),
  modifyMigrationsJsonMetadata: jest.fn(),
  readMigrationsJsonMetadata: jest.fn(),
}));

const sha = 'a'.repeat(40);

function givenInitialRef(ref: unknown) {
  (readMigrationsJsonMetadata as jest.Mock).mockReturnValue({
    initialGitRef: { ref, subject: 'chore: before migration' },
  });
}

async function cancelAndConfirm() {
  (window.showWarningMessage as jest.Mock).mockResolvedValue('Abort migration');
  await cancelMigration();
  // the reset runs in the modal's `.then` callback
  await new Promise((resolve) => setImmediate(resolve));
}

describe('cancelMigration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resets to the initial commit without going through a shell', async () => {
    givenInitialRef(sha);

    await cancelAndConfirm();

    expect(execFileSync).toHaveBeenCalledWith(
      'git',
      ['reset', '--hard', sha, '--'],
      { cwd: '/workspace' },
    );
    expect(execFileSync).toHaveBeenCalledWith('git', ['clean', '-fd'], {
      cwd: '/workspace',
    });
    expect(execSync).not.toHaveBeenCalledWith(
      expect.stringContaining('git'),
      expect.anything(),
    );
  });

  it.each([
    ['shell syntax', `${sha}; touch pwned`],
    ['command substitution', `$(touch pwned)`],
    ['a git option', '--upload-pack=touch pwned'],
    ['a branch name', 'main'],
    ['a non-string', 42],
  ])('refuses a ref containing %s', async (_, ref) => {
    givenInitialRef(ref);

    await cancelAndConfirm();

    expect(window.showWarningMessage).not.toHaveBeenCalled();
    expect(window.showErrorMessage).toHaveBeenCalled();
    expect(execFileSync).not.toHaveBeenCalled();
    expect(execSync).not.toHaveBeenCalled();
  });
});
