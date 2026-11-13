import { ensureDaemonIsStarted } from '@nx-console/shared-nx-workspace-info';
import { runManagedCommand } from '@nx-console/shared-utils';
import { nxStartDaemon, nxStopDaemon } from './nx-daemon';
import { platform } from 'os';
import { fileExists } from '@nx-console/shared-file-system';
import { readNxJson, getPackageManagerCommand } from '@nx-console/shared-npm';

jest.mock('@nx-console/shared-utils', () => ({
  ...jest.requireActual('@nx-console/shared-utils'),
  runManagedCommand: jest.fn().mockResolvedValue({ stdout: '', stderr: '' }),
}));
jest.mock('@nx-console/shared-file-system', () => ({
  ...jest.requireActual('@nx-console/shared-file-system'),
  fileExists: jest.fn(),
}));
jest.mock('../../../../shared/npm/src/lib/nx-json');
jest.mock(
  '../../../../shared/npm/src/lib/local-nx-utils/package-manager-command',
);
jest.mock('os', () => ({ ...jest.requireActual('os'), platform: jest.fn() }));

const logger = { log: jest.fn() };
const workspacePath = '/workspace with spaces';
const daemonClient = {
  enabled: () => true,
  isServerAvailable: async () => false,
};
const operations = [
  [
    'automatic startup',
    '--start',
    () =>
      ensureDaemonIsStarted(workspacePath, logger, { daemonClient } as never),
    90_000,
  ],
  [
    'explicit startup',
    '--start',
    () => nxStartDaemon(workspacePath, logger),
    90_000,
  ],
  ['shutdown', '--stop', () => nxStopDaemon(workspacePath, logger), 30_000],
] as const;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(platform).mockReturnValue('linux');
  jest.mocked(fileExists).mockResolvedValue(true);
  jest
    .mocked(readNxJson)
    .mockResolvedValue({ installation: { version: '24.0.6' } });
  jest
    .mocked(getPackageManagerCommand)
    .mockResolvedValue({ exec: 'yarn' } as never);
});

describe.each(operations)('%s', (_name, option, run, timeoutMs) => {
  it.each(['linux', 'win32'] as const)(
    'uses the encapsulated wrapper on %s despite a root Yarn package',
    async (os) => {
      jest.mocked(platform).mockReturnValue(os);
      await run();
      expect(runManagedCommand).toHaveBeenCalledWith(
        `${os === 'win32' ? './nx.bat' : './nx'} daemon ${option}`,
        {
          cwd: workspacePath,
          timeoutMs,
        },
      );
      expect(getPackageManagerCommand).not.toHaveBeenCalled();
    },
  );

  it.each(['yarn', 'npx', 'pnpm exec'])(
    'preserves %s for package-manager installations',
    async (exec) => {
      jest.mocked(readNxJson).mockResolvedValue({});
      jest
        .mocked(getPackageManagerCommand)
        .mockResolvedValue({ exec } as never);
      await run();
      expect(runManagedCommand).toHaveBeenCalledWith(
        `${exec} nx daemon ${option}`,
        {
          cwd: workspacePath,
          timeoutMs,
        },
      );
    },
  );
});
