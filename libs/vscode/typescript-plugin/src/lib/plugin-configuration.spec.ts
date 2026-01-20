import { findConfig, readJsonFile } from '@nx-console/shared-file-system';
import { dirname, join, posix, sep } from 'node:path';
import {
  getPluginConfiguration,
  PluginConfigurationCache,
  type RootFileInfo,
} from './plugin-configuration';

jest.mock('@nx-console/shared-file-system', () => ({
  readJsonFile: jest.fn(),
  listFiles: jest.fn(),
  findConfig: jest.fn(),
}));

jest.mock('@nx-console/shared-npm', () => ({
  ...jest.requireActual('@nx-console/shared-npm'),
  detectPackageManager: jest.fn().mockResolvedValue('npm'),
}));

describe('getPluginConfiguration', () => {
  const workspaceRoot = '/path/to/workspace';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('additionalRootFiles', () => {
    it('should return an empty array if tsconfig.base.json and tsconfig.json do not exist', async () => {
      (readJsonFile as jest.Mock).mockImplementation(async (file) => {
        if (file === 'tsconfig.base.json') {
          return { json: {} };
        }
        if (file === 'tsconfig.json') {
          return { json: {} };
        }
      });

      const result = await getPluginConfiguration(workspaceRoot);

      expect(result).toEqual({
        additionalRootFiles: [],
        packageManager: 'npm',
        workspacePackages: [],
      });
    });

    it('should return an empty array if compilerOptions is missing in tsconfig.base.json and tsconfig.json', async () => {
      (readJsonFile as jest.Mock).mockImplementation(async (file) => {
        if (file === 'tsconfig.base.json') {
          return { json: { someOtherProperty: 'value' } };
        }
        if (file === 'tsconfig.json') {
          return { json: { someOtherProperty: 'value' } };
        }
      });

      const result = await getPluginConfiguration(workspaceRoot);

      expect(result).toEqual({
        additionalRootFiles: [],
        packageManager: 'npm',
        workspacePackages: [],
      });
    });

    it('should return additional root files for simple path entries in tsconfig.base.json', async () => {
      (readJsonFile as jest.Mock).mockImplementation(async (file) => {
        if (file === 'tsconfig.base.json') {
          return {
            json: {
              compilerOptions: {
                paths: {
                  lib1: ['libs/lib1/index.ts'],
                  lib2: ['libs/lib2/index.ts'],
                },
              },
            },
          };
        } else {
          return { json: {} };
        }
      });
      (findConfig as jest.Mock).mockImplementation(async (mainFile) => {
        return join(dirname(mainFile), 'tsconfig.lib.json');
      });

      const result = await getPluginConfiguration(workspaceRoot);

      expect(pathNormalize(result.additionalRootFiles)).toEqual([
        {
          mainFile: '/path/to/workspace/libs/lib1/index.ts',
          directory: '/path/to/workspace/libs/lib1',
        },
        {
          mainFile: '/path/to/workspace/libs/lib2/index.ts',
          directory: '/path/to/workspace/libs/lib2',
        },
      ]);
    });

    it('should skip invalid path entries (non-array values or non-string values)', async () => {
      (readJsonFile as jest.Mock).mockImplementation(async (file) => {
        if (file === 'tsconfig.base.json') {
          return {
            json: {
              compilerOptions: {
                paths: {
                  validLib: ['libs/valid/index.ts'],
                  invalidNotArray: 'not-an-array',
                  invalidNumberInArray: [123, 'libs/mixed/index.ts'],
                  invalidAllNumbers: [456, 789],
                },
              },
            },
          };
        } else {
          return { json: {} };
        }
      });
      (findConfig as jest.Mock).mockImplementation(async (mainFile) => {
        return join(dirname(mainFile), 'tsconfig.lib.json');
      });

      const result = await getPluginConfiguration(workspaceRoot);

      expect(pathNormalize(result.additionalRootFiles)).toEqual([
        {
          mainFile: '/path/to/workspace/libs/valid/index.ts',
          directory: '/path/to/workspace/libs/valid',
        },
        {
          mainFile: '/path/to/workspace/libs/mixed/index.ts',
          directory: '/path/to/workspace/libs/mixed',
        },
      ]);
    });

    it('should return additional root files for simple path entries in tsconfig.json', async () => {
      (readJsonFile as jest.Mock).mockImplementation((file) => {
        if (file === 'tsconfig.json') {
          return {
            json: {
              compilerOptions: {
                paths: {
                  lib1: ['libs/lib1/index.ts'],
                  lib2: ['libs/lib2/index.ts'],
                },
              },
            },
          };
        } else {
          return { json: {} };
        }
      });
      (findConfig as jest.Mock).mockImplementation(async (mainFile) => {
        return join(dirname(mainFile), 'tsconfig.lib.json');
      });

      const result = await getPluginConfiguration(workspaceRoot);

      expect(pathNormalize(result.additionalRootFiles)).toEqual([
        {
          mainFile: '/path/to/workspace/libs/lib1/index.ts',
          directory: '/path/to/workspace/libs/lib1',
        },
        {
          mainFile: '/path/to/workspace/libs/lib2/index.ts',
          directory: '/path/to/workspace/libs/lib2',
        },
      ]);
    });
  });

  describe('workspacePackages', () => {
    it('should return an empty array if projectGraph is not provided', async () => {
      const result = await getPluginConfiguration(workspaceRoot);

      expect(result.workspacePackages).toEqual([]);
    });

    it('should return an empty array if projectGraph does not have any nodes', async () => {
      const result = await getPluginConfiguration(workspaceRoot, {
        nodes: {},
        dependencies: {},
      });

      expect(result.workspacePackages).toEqual([]);
    });

    it('should return an empty array if projectGraph does not have any nodes with metadata', async () => {
      const result = await getPluginConfiguration(workspaceRoot, {
        nodes: {
          pkg1: {
            name: 'pkg1',
            type: 'lib',
            data: { root: 'pkg1' },
          },
        },
        dependencies: {},
      });

      expect(result.workspacePackages).toEqual([]);
    });

    it('should return an empty array if projectGraph does not have any nodes with js metadata', async () => {
      const result = await getPluginConfiguration(workspaceRoot, {
        nodes: {
          pkg1: {
            name: 'pkg1',
            type: 'lib',
            data: { root: 'pkg1', metadata: {} },
          },
        },
        dependencies: {},
      });

      expect(result.workspacePackages).toEqual([]);
    });

    it('should return packages with js metadata and isInPackageManagerWorkspaces is true', async () => {
      const result = await getPluginConfiguration(workspaceRoot, {
        nodes: {
          pkg1: {
            name: 'pkg1',
            type: 'lib',
            data: {
              root: 'pkg1',
              metadata: {
                js: {
                  packageName: '@foo/pkg1',
                  isInPackageManagerWorkspaces: true,
                },
              },
            },
          },
          pkg2: {
            name: 'pkg2',
            type: 'lib',
            data: {
              root: 'pkg2',
              metadata: {
                js: {
                  packageName: '@foo/pkg2',
                  isInPackageManagerWorkspaces: false,
                },
              },
            },
          },
        },
        dependencies: {},
      });

      expect(result.workspacePackages).toEqual(['@foo/pkg1']);
    });
  });
});

describe('PluginConfigurationCache', () => {
  it('should return false if there is no cached result', async () => {
    const cache = new PluginConfigurationCache();

    expect(
      cache.matchesCachedResult({
        additionalRootFiles: [],
        packageManager: 'npm',
        workspacePackages: [],
      }),
    ).toBe(false);
  });

  it('should return false if incoming result has a different number of additionalRootFiles', async () => {
    const cache = new PluginConfigurationCache();
    cache.store({
      additionalRootFiles: [],
      packageManager: 'npm',
      workspacePackages: [],
    });

    expect(
      cache.matchesCachedResult({
        additionalRootFiles: [
          {
            mainFile: '/path/to/workspace/libs/lib1/index.ts',
            directory: '/path/to/workspace/libs/lib1',
          },
        ],
        packageManager: 'npm',
        workspacePackages: [],
      }),
    ).toBe(false);
  });

  it('should return false if the additionalRootFiles have the same length but different values', async () => {
    const cache = new PluginConfigurationCache();
    cache.store({
      additionalRootFiles: [
        {
          mainFile: '/path/to/workspace/libs/lib1/index.ts',
          directory: '/path/to/workspace/libs/lib1',
        },
      ],
      packageManager: 'npm',
      workspacePackages: [],
    });

    expect(
      cache.matchesCachedResult({
        additionalRootFiles: [
          {
            mainFile: '/path/to/workspace/libs/lib1/foo.ts',
            directory: '/path/to/workspace/libs/lib1',
          },
        ],
        packageManager: 'npm',
        workspacePackages: [],
      }),
    ).toBe(false);
  });

  it('should return false if incoming result has a different number of workspacePackages', async () => {
    const cache = new PluginConfigurationCache();
    cache.store({
      additionalRootFiles: [],
      packageManager: 'npm',
      workspacePackages: [],
    });

    expect(
      cache.matchesCachedResult({
        additionalRootFiles: [],
        packageManager: 'npm',
        workspacePackages: ['@foo/pkg1'],
      }),
    ).toBe(false);
  });

  it('should return false if the workspacePackages have the same length but different values', async () => {
    const cache = new PluginConfigurationCache();
    cache.store({
      additionalRootFiles: [],
      packageManager: 'npm',
      workspacePackages: ['@foo/pkg1'],
    });

    expect(
      cache.matchesCachedResult({
        additionalRootFiles: [],
        packageManager: 'npm',
        workspacePackages: ['@foo/pkg2'],
      }),
    ).toBe(false);
  });

  it('should return false if the packageManager is different', async () => {
    const cache = new PluginConfigurationCache();
    cache.store({
      additionalRootFiles: [],
      packageManager: 'npm',
      workspacePackages: [],
    });

    expect(
      cache.matchesCachedResult({
        additionalRootFiles: [],
        packageManager: 'yarn',
        workspacePackages: [],
      }),
    ).toBe(false);
  });

  it('should return true if all values are the same regardless of order', async () => {
    const cache = new PluginConfigurationCache();
    cache.store({
      additionalRootFiles: [
        {
          mainFile: '/path/to/workspace/libs/lib2/index.ts',
          directory: '/path/to/workspace/libs/lib2',
        },
        {
          mainFile: '/path/to/workspace/libs/lib1/index.ts',
          directory: '/path/to/workspace/libs/lib1',
        },
      ],
      packageManager: 'npm',
      workspacePackages: ['@foo/pkg1', '@foo/pkg2'],
    });

    expect(
      cache.matchesCachedResult({
        additionalRootFiles: [
          {
            mainFile: '/path/to/workspace/libs/lib1/index.ts',
            directory: '/path/to/workspace/libs/lib1',
          },
          {
            mainFile: '/path/to/workspace/libs/lib2/index.ts',
            directory: '/path/to/workspace/libs/lib2',
          },
        ],
        packageManager: 'npm',
        workspacePackages: ['@foo/pkg2', '@foo/pkg1'],
      }),
    ).toBe(true);
  });
});

function pathNormalize(rootFiles: RootFileInfo[]): RootFileInfo[] {
  return rootFiles.map(({ directory, mainFile }) => ({
    directory: directory.split(sep).join(posix.sep),
    mainFile: mainFile.split(sep).join(posix.sep),
  }));
}
