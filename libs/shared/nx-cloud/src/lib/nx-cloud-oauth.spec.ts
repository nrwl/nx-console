import { parse } from 'ini';

jest.mock('@nx-console/shared-npm', () => ({
  getPackageManagerCommand: jest.fn(async () => ({ exec: 'npx' })),
}));
jest.mock('@nx-console/shared-utils', () => ({
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
  let runManagedCommand: jest.Mock;
  let getNxCloudConfigIni: jest.Mock;

  beforeEach(() => {
    // the module keeps refresh state between calls
    jest.resetModules();
    getNxCloudOAuthAccessToken =
      require('./nx-cloud-oauth').getNxCloudOAuthAccessToken;
    runManagedCommand = require('@nx-console/shared-utils').runManagedCommand;
    getNxCloudConfigIni = require('./nx-cloud-config-ini').getNxCloudConfigIni;
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
});
