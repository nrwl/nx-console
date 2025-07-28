import { isNxCloudUsed } from './is-nx-cloud-used';
import * as npmModule from '@nx-console/shared-npm';

jest.mock('@nx-console/shared-npm');

describe('isNxCloudUsed', () => {
  const mockReadNxJson = npmModule.readNxJson as jest.MockedFunction<
    typeof npmModule.readNxJson
  >;
  const mockImportNxPackagePath = npmModule.importNxPackagePath as jest.MockedFunction<
    typeof npmModule.importNxPackagePath
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NX_NO_CLOUD;
    delete process.env.NX_CLOUD_ACCESS_TOKEN;
  });

  it('should return false when readNxJson throws', async () => {
    mockReadNxJson.mockRejectedValueOnce(new Error('File not found'));

    const result = await isNxCloudUsed('/workspace');

    expect(result).toBe(false);
  });

  it('should return false when NX_NO_CLOUD is true', async () => {
    process.env.NX_NO_CLOUD = 'true';
    mockReadNxJson.mockResolvedValueOnce({});
    mockImportNxPackagePath.mockRejectedValueOnce(new Error('Not found'));

    const result = await isNxCloudUsed('/workspace');

    expect(result).toBe(false);
  });

  it('should return false when neverConnectToCloud is true', async () => {
    mockReadNxJson.mockResolvedValueOnce({ neverConnectToCloud: true });
    mockImportNxPackagePath.mockRejectedValueOnce(new Error('Not found'));

    const result = await isNxCloudUsed('/workspace');

    expect(result).toBe(false);
  });

  it('should return true when NX_CLOUD_ACCESS_TOKEN is set', async () => {
    process.env.NX_CLOUD_ACCESS_TOKEN = 'token123';
    mockReadNxJson.mockResolvedValueOnce({});
    mockImportNxPackagePath.mockRejectedValueOnce(new Error('Not found'));

    const result = await isNxCloudUsed('/workspace');

    expect(result).toBe(true);
  });

  it('should return true when nxCloudAccessToken is set', async () => {
    mockReadNxJson.mockResolvedValueOnce({ nxCloudAccessToken: 'token123' });
    mockImportNxPackagePath.mockRejectedValueOnce(new Error('Not found'));

    const result = await isNxCloudUsed('/workspace');

    expect(result).toBe(true);
  });

  it('should return true when nxCloudId is set', async () => {
    mockReadNxJson.mockResolvedValueOnce({ nxCloudId: 'id123' });
    mockImportNxPackagePath.mockRejectedValueOnce(new Error('Not found'));

    const result = await isNxCloudUsed('/workspace');

    expect(result).toBe(true);
  });

  it('should handle tasksRunnerOptions being null', async () => {
    mockReadNxJson.mockResolvedValueOnce({ tasksRunnerOptions: null as any });
    mockImportNxPackagePath.mockRejectedValueOnce(new Error('Not found'));

    const result = await isNxCloudUsed('/workspace');

    expect(result).toBe(false);
  });

  it('should handle tasksRunnerOptions being undefined', async () => {
    mockReadNxJson.mockResolvedValueOnce({ tasksRunnerOptions: undefined });
    mockImportNxPackagePath.mockRejectedValueOnce(new Error('Not found'));

    const result = await isNxCloudUsed('/workspace');

    expect(result).toBe(false);
  });

  it('should handle tasksRunnerOptions being a non-object value', async () => {
    mockReadNxJson.mockResolvedValueOnce({ tasksRunnerOptions: 'invalid' as any });
    mockImportNxPackagePath.mockRejectedValueOnce(new Error('Not found'));

    const result = await isNxCloudUsed('/workspace');

    expect(result).toBe(false);
  });

  it('should handle tasksRunnerOptions being an array', async () => {
    mockReadNxJson.mockResolvedValueOnce({ tasksRunnerOptions: [] as any });
    mockImportNxPackagePath.mockRejectedValueOnce(new Error('Not found'));

    const result = await isNxCloudUsed('/workspace');

    expect(result).toBe(false);
  });

  it('should return true when tasksRunnerOptions contains nx-cloud runner', async () => {
    mockReadNxJson.mockResolvedValueOnce({
      tasksRunnerOptions: {
        default: {
          runner: 'nx-cloud',
        },
      },
    });
    mockImportNxPackagePath.mockRejectedValueOnce(new Error('Not found'));

    const result = await isNxCloudUsed('/workspace');

    expect(result).toBe(true);
  });

  it('should return true when tasksRunnerOptions contains @nrwl/nx-cloud runner', async () => {
    mockReadNxJson.mockResolvedValueOnce({
      tasksRunnerOptions: {
        default: {
          runner: '@nrwl/nx-cloud',
        },
      },
    });
    mockImportNxPackagePath.mockRejectedValueOnce(new Error('Not found'));

    const result = await isNxCloudUsed('/workspace');

    expect(result).toBe(true);
  });

  it('should handle runner being null or undefined', async () => {
    mockReadNxJson.mockResolvedValueOnce({
      tasksRunnerOptions: {
        default: {
          runner: null,
        },
        other: {
          runner: undefined,
        },
      },
    });
    mockImportNxPackagePath.mockRejectedValueOnce(new Error('Not found'));

    const result = await isNxCloudUsed('/workspace');

    expect(result).toBe(false);
  });

  it('should handle nxJson being null (edge case)', async () => {
    // This simulates a case where nxJson might be null
    mockReadNxJson.mockResolvedValueOnce(null as any);
    mockImportNxPackagePath.mockRejectedValueOnce(new Error('Not found'));

    const result = await isNxCloudUsed('/workspace');

    expect(result).toBe(false);
  });

  it('should use nx utils when available', async () => {
    const mockIsNxCloudUsed = jest.fn().mockReturnValue(true);
    mockReadNxJson.mockResolvedValueOnce({});
    mockImportNxPackagePath.mockResolvedValueOnce({
      isNxCloudUsed: mockIsNxCloudUsed,
    });

    const result = await isNxCloudUsed('/workspace');

    expect(result).toBe(true);
    expect(mockIsNxCloudUsed).toHaveBeenCalledWith({});
  });
});