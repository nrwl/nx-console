import { HttpError, httpRequest } from '@nx-console/shared-utils';
import { nxCloudAuthHeadersAfterOAuthRejection } from './nx-cloud-auth-headers';
import { nxCloudRequest, sanitizeNxCloudError } from './nx-cloud-request';

jest.mock('@nx-console/shared-utils', () => ({
  ...jest.requireActual('@nx-console/shared-utils'),
  httpRequest: jest.fn(),
}));
jest.mock('./nx-cloud-auth-headers', () => ({
  nxCloudAuthHeadersAfterOAuthRejection: jest.fn(),
}));

describe('sanitizeNxCloudError', () => {
  const requestUrl =
    'https://my-company.nx.app/nx-cloud/mcp-context/pipeline-executions/search';
  const origin = 'https://my-company.nx.app';

  it('should replace the full URL with the endpoint label in error.message', () => {
    const error = new Error(`Request to ${requestUrl} failed`);
    sanitizeNxCloudError(error, requestUrl, 'PIPELINE_EXECUTIONS_SEARCH');
    expect(error.message).toBe(
      'Request to {PIPELINE_EXECUTIONS_SEARCH} failed',
    );
    expect(error.message).not.toContain('/');
  });

  it('should replace remaining origin occurrences with {NX_CLOUD_URL}', () => {
    const error = new Error(`Connection to ${origin} refused`);
    sanitizeNxCloudError(error, requestUrl, 'PIPELINE_EXECUTIONS_SEARCH');
    expect(error.message).toBe('Connection to {NX_CLOUD_URL} refused');
    expect(error.message).not.toContain(origin);
  });

  it('should sanitize error.stack', () => {
    const error = new Error(`fail`);
    error.stack = `Error: fail\n    at fetch (${requestUrl})`;
    sanitizeNxCloudError(error, requestUrl, 'RECENT_CIPES');
    expect(error.stack).not.toContain(origin);
    expect(error.stack).toContain('{RECENT_CIPES}');
  });

  it('should sanitize HttpError.responseText', () => {
    const error = new HttpError(406, `Not acceptable for ${requestUrl}`, {});
    sanitizeNxCloudError(error, requestUrl, 'RUN_DETAILS');
    expect(error.responseText).toBe('Not acceptable for {RUN_DETAILS}');
    expect(error.responseText).not.toContain(origin);
  });

  it('should handle both full URL and origin in the same string', () => {
    const error = new Error(
      `Redirect from ${requestUrl} to ${origin}/other-path`,
    );
    sanitizeNxCloudError(error, requestUrl, 'TASKS_SEARCH');
    expect(error.message).toBe(
      'Redirect from {TASKS_SEARCH} to {NX_CLOUD_URL}/other-path',
    );
  });

  it('should produce a label with no slashes', () => {
    const labels = [
      'RECENT_CIPES',
      'RUN_DETAILS',
      'TASK_DETAILS',
      'TASKS_SEARCH',
      'PIPELINE_EXECUTIONS_SEARCH',
      'RETRIEVE_FIX_DIFF',
      'UPDATE_SUGGESTED_FIX',
      'ARTIFACT_DOWNLOAD',
      'IS_WORKSPACE_CLAIMED',
    ];
    for (const label of labels) {
      const error = new Error(`Request to ${requestUrl} failed`);
      sanitizeNxCloudError(error, requestUrl, label);
      expect(error.message).not.toContain(origin);
      // the replaced placeholder should have no slashes
      const placeholder = `{${label}}`;
      expect(placeholder).not.toMatch(/\//);
    }
  });

  it('should not crash on non-Error values', () => {
    const result = sanitizeNxCloudError('string error', requestUrl, 'LABEL');
    expect(result).toBe('string error');
  });

  it('should not crash on invalid requestUrl', () => {
    const error = new Error('something broke');
    sanitizeNxCloudError(error, 'not-a-url', 'LABEL');
    expect(error.message).toBe('something broke');
  });
});

describe('nxCloudRequest', () => {
  const url = 'https://cloud.nx.app/nx-cloud/nx-console/ci-pipeline-executions';
  const rejection = () =>
    new HttpError(
      401,
      JSON.stringify({ code: 'OAUTH_ACCESS_TOKEN_INVALID' }),
      {},
    );
  const ok = { status: 200, responseText: '{}', headers: {} };

  beforeEach(() => {
    jest.mocked(httpRequest).mockReset();
    jest.mocked(nxCloudAuthHeadersAfterOAuthRejection).mockReset();
  });

  it('should replay a request once with the headers that replace a rejected OAuth token', async () => {
    jest
      .mocked(httpRequest)
      .mockRejectedValueOnce(rejection())
      .mockResolvedValueOnce(ok);
    jest.mocked(nxCloudAuthHeadersAfterOAuthRejection).mockResolvedValue({
      'Nx-Cloud-Id': 'cloud-id',
      'Nx-Cloud-Personal-Access-Token': 'pat',
    });

    expect(
      await nxCloudRequest('RECENT_CIPES', {
        url,
        headers: {
          'Content-Type': 'application/json',
          'Nx-Cloud-Id': 'cloud-id',
          'Nx-Cloud-OAuth-Access-Token': 'rejected',
        },
      }),
    ).toBe(ok);
    expect(nxCloudAuthHeadersAfterOAuthRejection).toHaveBeenCalledWith(
      'rejected',
    );
    expect(httpRequest).toHaveBeenLastCalledWith({
      url,
      headers: {
        'Content-Type': 'application/json',
        'Nx-Cloud-Id': 'cloud-id',
        'Nx-Cloud-Personal-Access-Token': 'pat',
      },
    });
  });

  it('should not replay a request that sent no OAuth token', async () => {
    jest.mocked(httpRequest).mockRejectedValue(rejection());

    await expect(
      nxCloudRequest('RECENT_CIPES', { url, headers: {} }),
    ).rejects.toBeInstanceOf(HttpError);
    expect(httpRequest).toHaveBeenCalledTimes(1);
    expect(nxCloudAuthHeadersAfterOAuthRejection).not.toHaveBeenCalled();
  });

  it('should not replay a request a second time', async () => {
    jest.mocked(httpRequest).mockRejectedValue(rejection());
    jest.mocked(nxCloudAuthHeadersAfterOAuthRejection).mockResolvedValue({
      'Nx-Cloud-OAuth-Access-Token': 'also-rejected',
    });

    await expect(
      nxCloudRequest('RECENT_CIPES', {
        url,
        headers: { 'Nx-Cloud-OAuth-Access-Token': 'rejected' },
      }),
    ).rejects.toBeInstanceOf(HttpError);
    expect(httpRequest).toHaveBeenCalledTimes(2);
  });
});
