import { getExternalFiles } from './get-external-files';
import {
  readAndCacheJsonFile,
  listFiles,
} from '@nx-console/shared/file-system';
import { findConfig } from '@nx-console/shared/utils';
import { dirname, join, posix, sep } from 'node:path';

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

    expect(pathNormalize(result)).toEqual([
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

    expect(pathNormalize(result)).toEqual([
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

function pathNormalize(
  externalFiles: { directory: string; mainFile: string }[]
): { directory: string; mainFile: string }[] {
  return externalFiles.map(({ directory, mainFile }) => ({
    directory: directory.split(sep).join(posix.sep),
    mainFile: mainFile.split(sep).join(posix.sep),
  }));
}
