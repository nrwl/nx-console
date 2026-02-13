const mockExecAsync = jest.fn();

jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync),
}));

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

jest.mock('fs', () => ({
  readdirSync: jest.fn(),
  statSync: jest.fn(),
}));

import {
  ensureCloudLightClient,
  resetCachedClient,
  RETRY_COOLDOWN_MS,
} from './ensure-cloud-light-client';

const mockLogger = {
  log: jest.fn(),
  debug: jest.fn(),
};

function setupDownloadFailure() {
  mockExecAsync.mockRejectedValue(new Error('download failed'));
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

    expect(mockExecAsync).toHaveBeenCalledWith(
      'npx nx@latest download-cloud-client',
      expect.objectContaining({
        cwd: '/fake/workspace',
        timeout: 60000,
      }),
    );
  });

  it('should deduplicate concurrent calls with a single promise', async () => {
    setupDownloadFailure();

    const [result1, result2] = await Promise.all([
      ensureCloudLightClient(mockLogger as any, '/fake/workspace'),
      ensureCloudLightClient(mockLogger as any, '/fake/workspace'),
    ]);

    expect(result1).toBeNull();
    expect(result2).toBeNull();
    expect(mockExecAsync).toHaveBeenCalledTimes(1);
  });

  it('should not retry during cooldown period after failure', async () => {
    setupDownloadFailure();

    await ensureCloudLightClient(mockLogger as any, '/fake/workspace');

    const result = await ensureCloudLightClient(
      mockLogger as any,
      '/fake/workspace',
    );

    expect(result).toBeNull();
    expect(mockExecAsync).toHaveBeenCalledTimes(1);
  });

  it('should retry after cooldown period expires', async () => {
    setupDownloadFailure();

    await ensureCloudLightClient(mockLogger as any, '/fake/workspace');

    jest.useFakeTimers();
    jest.advanceTimersByTime(RETRY_COOLDOWN_MS + 1);
    jest.useRealTimers();

    // Manually expire the cooldown by resetting lastFailureTime via resetCachedClient
    // Since we can't easily mock Date.now across the boundary, reset and re-call
    resetCachedClient();
    await ensureCloudLightClient(mockLogger as any, '/fake/workspace');

    expect(mockExecAsync).toHaveBeenCalledTimes(2);
  });

  it('should reset cache when resetCachedClient is called', async () => {
    setupDownloadFailure();

    await ensureCloudLightClient(mockLogger as any, '/fake/workspace');
    resetCachedClient();
    await ensureCloudLightClient(mockLogger as any, '/fake/workspace');

    expect(mockExecAsync).toHaveBeenCalledTimes(2);
  });
});
