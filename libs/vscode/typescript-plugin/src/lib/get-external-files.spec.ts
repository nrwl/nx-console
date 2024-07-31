import { getExternalFiles } from './get-external-files';
import {
  readAndCacheJsonFile,
  listFiles,
} from '@nx-console/shared/file-system';
import { findConfig } from '@nx-console/shared/utils';
import { dirname, join } from 'node:path';

jest.mock('@nx-console/shared/file-system', () => ({
  readAndCacheJsonFile: jest.fn(),
  listFiles: jest.fn(),
}));

jest.mock('@nx-console/shared/utils', () => ({
  findConfig: jest.fn(),
}));

describe('getExternalFiles', () => {
  const workspaceRoot = '/path/to/workspace';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return an empty array if tsconfig.base.json and tsconfig.json do not exist', async () => {
    (readAndCacheJsonFile as jest.Mock).mockImplementation(async (file) => {
      if (file === 'tsconfig.base.json') {
        return { json: {} };
      }
      if (file === 'tsconfig.json') {
        return { json: {} };
      }
    });

    const result = await getExternalFiles(workspaceRoot);

    expect(result).toEqual([]);
  });

  it('should return an empty array if compilerOptions is missing in tsconfig.base.json and tsconfig.json', async () => {
    (readAndCacheJsonFile as jest.Mock).mockImplementation(async (file) => {
      if (file === 'tsconfig.base.json') {
        return { json: { someOtherProperty: 'value' } };
      }
      if (file === 'tsconfig.json') {
        return { json: { someOtherProperty: 'value' } };
      }
    });

    const result = await getExternalFiles(workspaceRoot);

    expect(result).toEqual([]);
  });

  it('should return external files for simple path entries in tsconfig.base.json', async () => {
    (readAndCacheJsonFile as jest.Mock).mockImplementation(async (file) => {
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

    const result = await getExternalFiles(workspaceRoot);

    expect(result).toEqual([
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

  it('should return external files for simple path entries in tsconfig.json', async () => {
    (readAndCacheJsonFile as jest.Mock).mockImplementation((file) => {
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

    const result = await getExternalFiles(workspaceRoot);

    expect(result).toEqual([
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

  it('should return external files for wildcard path entries ', async () => {
    (readAndCacheJsonFile as jest.Mock).mockImplementation((file) => {
      if (file === 'tsconfig.base.json') {
        return {
          json: {
            compilerOptions: {
              paths: {
                'lib1/*': ['libs/lib1/*'],
                'lib2/*': ['libs/lib2/*'],
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
    (listFiles as jest.Mock).mockImplementation((dirName) => {
      return [
        `${dirName}/index.ts`,
        `${dirName}/other.ts`,
        `${dirName}/folder/nested.ts`,
      ];
    });

    const result = await getExternalFiles(workspaceRoot);

    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "directory": "/path/to/workspace/libs/lib1",
          "mainFile": "/path/to/workspace/libs/lib1/index.ts",
        },
        Object {
          "directory": "/path/to/workspace/libs/lib1",
          "mainFile": "/path/to/workspace/libs/lib1/other.ts",
        },
        Object {
          "directory": "/path/to/workspace/libs/lib1",
          "mainFile": "/path/to/workspace/libs/lib1/folder/nested.ts",
        },
        Object {
          "directory": "/path/to/workspace/libs/lib2",
          "mainFile": "/path/to/workspace/libs/lib2/index.ts",
        },
        Object {
          "directory": "/path/to/workspace/libs/lib2",
          "mainFile": "/path/to/workspace/libs/lib2/other.ts",
        },
        Object {
          "directory": "/path/to/workspace/libs/lib2",
          "mainFile": "/path/to/workspace/libs/lib2/folder/nested.ts",
        },
      ]
    `);
  });

  it('should handle multiple values for path entry', async () => {
    (readAndCacheJsonFile as jest.Mock).mockImplementation((file) => {
      if (file === 'tsconfig.base.json') {
        return {
          json: {
            compilerOptions: {
              paths: {
                lib1: ['libs/lib1/index.ts', 'libs/lib1/other.ts'],
                'lib2/*': ['libs/lib2/*', 'libs/other/*'],
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
    (listFiles as jest.Mock).mockImplementation((dirName) => {
      return [
        `${dirName}/index.ts`,
        `${dirName}/other.ts`,
        `${dirName}/folder/nested.ts`,
      ];
    });

    const result = await getExternalFiles(workspaceRoot);

    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "directory": "/path/to/workspace/libs/lib1",
          "mainFile": "/path/to/workspace/libs/lib1/index.ts",
        },
        Object {
          "directory": "/path/to/workspace/libs/lib1",
          "mainFile": "/path/to/workspace/libs/lib1/other.ts",
        },
        Object {
          "directory": "/path/to/workspace/libs/lib2",
          "mainFile": "/path/to/workspace/libs/lib2/index.ts",
        },
        Object {
          "directory": "/path/to/workspace/libs/lib2",
          "mainFile": "/path/to/workspace/libs/lib2/other.ts",
        },
        Object {
          "directory": "/path/to/workspace/libs/lib2",
          "mainFile": "/path/to/workspace/libs/lib2/folder/nested.ts",
        },
        Object {
          "directory": "/path/to/workspace/libs/other",
          "mainFile": "/path/to/workspace/libs/other/index.ts",
        },
        Object {
          "directory": "/path/to/workspace/libs/other",
          "mainFile": "/path/to/workspace/libs/other/other.ts",
        },
        Object {
          "directory": "/path/to/workspace/libs/other",
          "mainFile": "/path/to/workspace/libs/other/folder/nested.ts",
        },
      ]
    `);
  });
});
