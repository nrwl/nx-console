jest.mock('./cloud-ids', () => ({
  getNxCloudUrl: jest.fn(async () => 'https://cloud.nx.app'),
  getNxCloudId: jest.fn(async () => 'cloud-id'),
  getNxAccessToken: jest.fn(async () => undefined),
}));
jest.mock('./nx-cloud-config-ini', () => ({
  getNxCloudConfigIni: jest.fn(() => ({
    'https://cloud.nx.app': { personalAccessToken: 'pat' },
  })),
}));
jest.mock('./nx-cloud-oauth', () => ({
  ...jest.requireActual('./nx-cloud-oauth'),
  getNxCloudOAuthAccessToken: jest.fn(),
  rejectNxCloudOAuthAccessToken: jest.fn(),
}));

describe('nxCloudAuthHeaders', () => {
  let nxCloudAuthHeaders: typeof import('./nx-cloud-auth-headers').nxCloudAuthHeaders;
  let nxCloudAuthHeadersAfterOAuthRejection: typeof import('./nx-cloud-auth-headers').nxCloudAuthHeadersAfterOAuthRejection;
  let getNxCloudOAuthAccessToken: jest.Mock;
  let rejectNxCloudOAuthAccessToken: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    ({
      nxCloudAuthHeaders,
      nxCloudAuthHeadersAfterOAuthRejection,
    } = require('./nx-cloud-auth-headers'));
    ({
      getNxCloudOAuthAccessToken,
      rejectNxCloudOAuthAccessToken,
    } = require('./nx-cloud-oauth'));
  });

  it('should send the OAuth access token instead of the personal access token', async () => {
    getNxCloudOAuthAccessToken.mockResolvedValue('oauth');

    expect(await nxCloudAuthHeaders('/workspace')).toEqual({
      'Nx-Cloud-Id': 'cloud-id',
      'Nx-Cloud-OAuth-Access-Token': 'oauth',
    });
  });

  it('should send the personal access token without a usable OAuth login', async () => {
    getNxCloudOAuthAccessToken.mockResolvedValue(undefined);

    expect(await nxCloudAuthHeaders('/workspace')).toEqual({
      'Nx-Cloud-Id': 'cloud-id',
      'Nx-Cloud-Personal-Access-Token': 'pat',
    });
  });

  it('should answer a rejected token with fresh headers for its workspace', async () => {
    const logger = { log: jest.fn() };
    getNxCloudOAuthAccessToken.mockResolvedValueOnce('rejected');
    await nxCloudAuthHeaders('/workspace', logger);

    getNxCloudOAuthAccessToken.mockResolvedValueOnce(undefined);
    expect(await nxCloudAuthHeadersAfterOAuthRejection('rejected')).toEqual({
      'Nx-Cloud-Id': 'cloud-id',
      'Nx-Cloud-Personal-Access-Token': 'pat',
    });
    expect(rejectNxCloudOAuthAccessToken).toHaveBeenCalledWith('rejected');
    expect(getNxCloudOAuthAccessToken).toHaveBeenLastCalledWith(
      '/workspace',
      'https://cloud.nx.app',
      logger,
    );
  });

  it('should ignore a token it did not send', async () => {
    expect(
      await nxCloudAuthHeadersAfterOAuthRejection('unknown'),
    ).toBeUndefined();
    expect(rejectNxCloudOAuthAccessToken).not.toHaveBeenCalled();
  });
});
