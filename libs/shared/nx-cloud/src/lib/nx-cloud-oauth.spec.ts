import { parse } from 'ini';

jest.mock('@nx-console/shared-npm', () => ({
  getPackageManagerCommand: jest.fn(async () => ({ exec: 'npx' })),
}));
jest.mock('@nx-console/shared-utils', () => ({
  ...jest.requireActual('@nx-console/shared-utils'),
  runManagedCommand: jest.fn(),
}));
jest.mock('./nx-cloud-config-ini', () => ({
  getNxCloudConfigIni: jest.fn(),
}));

const nxCloudUrl = 'https://cloud.nx.app';
const workspacePath = '/workspace';

// nx login escapes the dots in the section name
function ini(accessToken: string, expiresAt: number) {
  return parse(
    [
      '[https://cloud\\.nx\\.app]',
      `oauthAccessToken=${accessToken}`,
      'oauthRefreshToken=refresh',
      'oauthTokenType=Bearer',
      `oauthAccessTokenExpiresAt=${new Date(expiresAt).toISOString()}`,
    ].join('\n'),
  );
}

describe('getNxCloudOAuthAccessToken', () => {
  let getNxCloudOAuthAccessToken: typeof import('./nx-cloud-oauth').getNxCloudOAuthAccessToken;
  let rejectNxCloudOAuthAccessToken: typeof import('./nx-cloud-oauth').rejectNxCloudOAuthAccessToken;
  let runManagedCommand: jest.Mock;
  let getNxCloudConfigIni: jest.Mock;

  beforeEach(() => {
    // the module keeps refresh state between calls
    jest.resetModules();
    ({
      getNxCloudOAuthAccessToken,
      rejectNxCloudOAuthAccessToken,
    } = require('./nx-cloud-oauth'));
    runManagedCommand = require('@nx-console/shared-utils').runManagedCommand;
    getNxCloudConfigIni = require('./nx-cloud-config-ini').getNxCloudConfigIni;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return undefined without an OAuth login', async () => {
    getNxCloudConfigIni.mockReturnValue(
      parse('[https://cloud\\.nx\\.app]\npersonalAccessToken=pat'),
    );

    expect(
      await getNxCloudOAuthAccessToken(workspacePath, nxCloudUrl),
    ).toBeUndefined();
    expect(runManagedCommand).not.toHaveBeenCalled();
  });

  it('should return a fresh token without refreshing it', async () => {
    getNxCloudConfigIni.mockReturnValue(ini('fresh', Date.now() + 10 * 60_000));

    expect(await getNxCloudOAuthAccessToken(workspacePath, nxCloudUrl)).toBe(
      'fresh',
    );
    expect(runManagedCommand).not.toHaveBeenCalled();
  });

  it('should match a cloud URL with a trailing slash', async () => {
    getNxCloudConfigIni.mockReturnValue(ini('fresh', Date.now() + 10 * 60_000));

    expect(
      await getNxCloudOAuthAccessToken(workspacePath, `${nxCloudUrl}/`),
    ).toBe('fresh');
  });

  it('should refresh an expiring token through the nx-cloud CLI', async () => {
    getNxCloudConfigIni
      .mockReturnValueOnce(ini('expiring', Date.now() + 30_000))
      .mockReturnValue(ini('refreshed', Date.now() + 15 * 60_000));
    runManagedCommand.mockResolvedValue({ stdout: '', stderr: '' });

    expect(await getNxCloudOAuthAccessToken(workspacePath, nxCloudUrl)).toBe(
      'refreshed',
    );
    expect(runManagedCommand).toHaveBeenCalledWith(
      'npx nx-cloud login --status',
      expect.objectContaining({ cwd: workspacePath }),
    );
  });

  it('should share one refresh between concurrent requests', async () => {
    getNxCloudConfigIni
      .mockReturnValueOnce(ini('expired', Date.now() - 1))
      .mockReturnValueOnce(ini('expired', Date.now() - 1))
      .mockReturnValue(ini('refreshed', Date.now() + 15 * 60_000));
    runManagedCommand.mockResolvedValue({ stdout: '', stderr: '' });

    const tokens = await Promise.all([
      getNxCloudOAuthAccessToken(workspacePath, nxCloudUrl),
      getNxCloudOAuthAccessToken(workspacePath, nxCloudUrl),
    ]);

    expect(tokens).toEqual(['refreshed', 'refreshed']);
    expect(runManagedCommand).toHaveBeenCalledTimes(1);
  });

  it('should not send an expired token or retry right after a failed refresh', async () => {
    getNxCloudConfigIni.mockReturnValue(ini('expired', Date.now() - 1));
    runManagedCommand.mockRejectedValue(new Error('login expired'));

    expect(
      await getNxCloudOAuthAccessToken(workspacePath, nxCloudUrl),
    ).toBeUndefined();
    expect(
      await getNxCloudOAuthAccessToken(workspacePath, nxCloudUrl),
    ).toBeUndefined();
    expect(runManagedCommand).toHaveBeenCalledTimes(1);
  });

  it('should back off further after each failed refresh', async () => {
    jest.useFakeTimers({ now: 0 });
    getNxCloudConfigIni.mockImplementation(() =>
      ini('expired', Date.now() - 1),
    );
    runManagedCommand.mockRejectedValue(new Error('login expired'));

    await getNxCloudOAuthAccessToken(workspacePath, nxCloudUrl);
    jest.setSystemTime(61_000);
    await getNxCloudOAuthAccessToken(workspacePath, nxCloudUrl);
    expect(runManagedCommand).toHaveBeenCalledTimes(2);

    // the second failure holds the next attempt back for two minutes
    jest.setSystemTime(61_000 + 61_000);
    await getNxCloudOAuthAccessToken(workspacePath, nxCloudUrl);
    expect(runManagedCommand).toHaveBeenCalledTimes(2);

    jest.setSystemTime(61_000 + 121_000);
    await getNxCloudOAuthAccessToken(workspacePath, nxCloudUrl);
    expect(runManagedCommand).toHaveBeenCalledTimes(3);
  });

  it('should retry right away once the user logged in again', async () => {
    getNxCloudConfigIni.mockReturnValue(ini('expired', Date.now() - 1));
    runManagedCommand.mockRejectedValue(new Error('login expired'));
    await getNxCloudOAuthAccessToken(workspacePath, nxCloudUrl);

    getNxCloudConfigIni
      .mockReturnValueOnce(ini('new-login', Date.now() + 30_000))
      .mockReturnValue(ini('refreshed', Date.now() + 15 * 60_000));
    runManagedCommand.mockResolvedValue({ stdout: '', stderr: '' });

    expect(await getNxCloudOAuthAccessToken(workspacePath, nxCloudUrl)).toBe(
      'refreshed',
    );
    expect(runManagedCommand).toHaveBeenCalledTimes(2);
  });

  it('should log why a refresh failed', async () => {
    const { ManagedCommandError } = require('@nx-console/shared-utils');
    const logger = { log: jest.fn() };
    getNxCloudConfigIni.mockReturnValue(ini('expired', Date.now() - 1));
    runManagedCommand.mockRejectedValue(
      new ManagedCommandError(
        'failed',
        'Your Nx Cloud login has expired',
        '',
        1,
        false,
      ),
    );

    await getNxCloudOAuthAccessToken(workspacePath, nxCloudUrl, logger);

    expect(logger.log).toHaveBeenLastCalledWith(
      expect.stringContaining(
        'exited with code 1\nYour Nx Cloud login has expired',
      ),
    );
  });

  it('should stop waiting for a slow refresh without stopping it', async () => {
    jest.useFakeTimers();
    getNxCloudConfigIni.mockReturnValue(ini('expired', Date.now() - 1));
    let finishRefresh: () => void = () => undefined;
    runManagedCommand.mockReturnValue(
      new Promise((resolve) => {
        finishRefresh = () => resolve({ stdout: '', stderr: '' });
      }),
    );

    const token = getNxCloudOAuthAccessToken(workspacePath, nxCloudUrl);
    await jest.advanceTimersByTimeAsync(30_000);
    expect(await token).toBeUndefined();
    expect(runManagedCommand).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ timeoutMs: 5 * 60_000 }),
    );

    // the refresh is still running, so a new request joins it
    const second = getNxCloudOAuthAccessToken(workspacePath, nxCloudUrl);
    getNxCloudConfigIni.mockReturnValue(
      ini('refreshed', Date.now() + 15 * 60_000),
    );
    finishRefresh();
    expect(await second).toBe('refreshed');
    expect(runManagedCommand).toHaveBeenCalledTimes(1);
  });

  it('should refresh a rejected token right after the last refresh', async () => {
    getNxCloudConfigIni
      .mockReturnValueOnce(ini('expiring', Date.now() + 30_000))
      .mockReturnValue(ini('refreshed', Date.now() + 15 * 60_000));
    runManagedCommand.mockResolvedValue({ stdout: '', stderr: '' });
    expect(await getNxCloudOAuthAccessToken(workspacePath, nxCloudUrl)).toBe(
      'refreshed',
    );

    rejectNxCloudOAuthAccessToken('refreshed');
    getNxCloudConfigIni
      .mockReturnValueOnce(ini('refreshed', Date.now() + 15 * 60_000))
      .mockReturnValue(ini('replaced', Date.now() + 15 * 60_000));

    expect(await getNxCloudOAuthAccessToken(workspacePath, nxCloudUrl)).toBe(
      'replaced',
    );
    expect(runManagedCommand).toHaveBeenCalledTimes(2);
  });

  it('should not send a rejected token the CLI could not replace', async () => {
    getNxCloudConfigIni.mockReturnValue(ini('fresh', Date.now() + 10 * 60_000));
    runManagedCommand.mockResolvedValue({ stdout: '', stderr: '' });

    rejectNxCloudOAuthAccessToken('fresh');

    expect(
      await getNxCloudOAuthAccessToken(workspacePath, nxCloudUrl),
    ).toBeUndefined();
  });
});

describe('isNxCloudOAuthAccessTokenRejection', () => {
  const { isNxCloudOAuthAccessTokenRejection } = require('./nx-cloud-oauth');

  it('should recognize the rejection of an OAuth access token', () => {
    const body = JSON.stringify({ code: 'OAUTH_ACCESS_TOKEN_INVALID' });
    expect(isNxCloudOAuthAccessTokenRejection(401, body)).toBe(true);
    expect(isNxCloudOAuthAccessTokenRejection(403, body)).toBe(true);
    expect(isNxCloudOAuthAccessTokenRejection(500, body)).toBe(false);
    expect(isNxCloudOAuthAccessTokenRejection(401, 'Unauthorized')).toBe(false);
  });
});
