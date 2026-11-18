import { getNxVersion } from '@nx-console/vscode-nx-workspace';
import { selectAffectedFlags } from './select-affected-flags';
import { selectFlags } from './select-flags';

jest.mock('@nx-console/vscode-nx-workspace', () => ({
  getNxVersion: jest.fn(),
}));
jest.mock('./select-flags', () => ({ selectFlags: jest.fn() }));

it.each([
  [{ major: 15, minor: 0, full: '15.0.0' }, true],
  [{ major: 16, minor: 1, full: '16.1.4' }, true],
  [{ major: 16, minor: 2, full: '16.2.0-beta.0' }, false],
  [{ major: 16, minor: 2, full: '16.2.1' }, false],
  [{ major: 24, minor: 0, full: '24.0.6' }, false],
  [{ major: 0, minor: 0, full: '0.0.0' }, false],
  [undefined, false],
])('for Nx %j, offers --all: %s', async (version, supportsAll) => {
  jest.mocked(getNxVersion).mockResolvedValue(version);
  jest.mocked(selectFlags).mockClear();

  await selectAffectedFlags('test');

  expect(selectFlags).toHaveBeenCalledTimes(1);
  const [command, options, flags] = jest.mocked(selectFlags).mock.calls[0];
  expect(command).toBe('affected');
  expect(flags).toEqual({ target: 'test' });
  const flagNames = options.map(({ name }) => name);
  expect(flagNames).toContain('files');
  expect(flagNames.includes('all')).toBe(supportsAll);
});
