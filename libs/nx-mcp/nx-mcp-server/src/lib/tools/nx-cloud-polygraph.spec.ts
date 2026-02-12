// Mock shared modules to avoid transitive dependency issues
jest.mock('@nx-console/shared-llm-context', () => ({
  CLOUD_POLYGRAPH_INIT: 'cloud_polygraph_init',
  CLOUD_POLYGRAPH_DELEGATE: 'cloud_polygraph_delegate',
  CLOUD_POLYGRAPH_PUSH_BRANCH: 'cloud_polygraph_push_branch',
  CLOUD_POLYGRAPH_CREATE_PRS: 'cloud_polygraph_create_prs',
  CLOUD_POLYGRAPH_GET_SESSION: 'cloud_polygraph_get_session',
  CLOUD_POLYGRAPH_MARK_READY: 'cloud_polygraph_mark_ready',
  CLOUD_POLYGRAPH_STOP_CHILD: 'cloud_polygraph_stop_child',
  CLOUD_POLYGRAPH_CHILD_STATUS: 'cloud_polygraph_child_status',
  CLOUD_POLYGRAPH_ASSOCIATE_PR: 'cloud_polygraph_associate_pr',
}));

jest.mock('@nx-console/shared-nx-cloud', () => ({
  getNxCloudId: jest.fn(),
  getNxCloudUrl: jest.fn(),
  nxCloudAuthHeaders: jest.fn(),
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

jest.mock('fs', () => ({
  readdirSync: jest.fn(),
  statSync: jest.fn(),
}));

import { execSync } from 'child_process';
import { __testing__ } from './nx-cloud-polygraph';

const { ensureCloudLightClient, resetCachedClient } = __testing__;
const mockExecSync = jest.mocked(execSync);

const mockLogger = {
  log: jest.fn(),
  debug: jest.fn(),
};

function setupDownloadFailure() {
  mockExecSync.mockImplementation(() => {
    throw new Error('download failed');
  });
}

describe('ensureCloudLightClient', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetCachedClient();
    Object.keys(require.cache).forEach((key) => {
      if (key.includes('polygraph-handlers')) {
        delete require.cache[key];
      }
    });
  });

  it('should return null when bundle cannot be found and download fails', async () => {
    setupDownloadFailure();

    const result = await ensureCloudLightClient(
      mockLogger as any,
      '/fake/workspace',
    );

    expect(result).toBeNull();
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Attempting to download'),
    );
  });

  it('should attempt download when bundle is not found', async () => {
    setupDownloadFailure();

    await ensureCloudLightClient(mockLogger as any, '/fake/workspace');

    expect(mockExecSync).toHaveBeenCalledWith(
      'npx nx@latest download-cloud-client',
      expect.objectContaining({
        cwd: '/fake/workspace',
        stdio: 'pipe',
        timeout: 60000,
      }),
    );
  });

  it('should cache the result after first call', async () => {
    setupDownloadFailure();

    const result1 = await ensureCloudLightClient(
      mockLogger as any,
      '/fake/workspace',
    );
    const result2 = await ensureCloudLightClient(
      mockLogger as any,
      '/fake/workspace',
    );

    expect(result1).toBeNull();
    expect(result2).toBeNull();
    expect(mockExecSync).toHaveBeenCalledTimes(1);
  });

  it('should reset cache when resetCachedClient is called', async () => {
    setupDownloadFailure();

    await ensureCloudLightClient(mockLogger as any, '/fake/workspace');
    resetCachedClient();
    await ensureCloudLightClient(mockLogger as any, '/fake/workspace');

    expect(mockExecSync).toHaveBeenCalledTimes(2);
  });
});
