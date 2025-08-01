import { readJsonFile } from '@nx-console/shared-file-system';
import { packageDetails } from './package-details';
import { normalize } from 'node:path';

jest.mock('@nx-console/shared-file-system');

describe('packageDetails', () => {
  it('should return package path, package name and JSON contents', async () => {
    const readJsonFileMock = jest.mocked(readJsonFile).mockResolvedValueOnce({
      path: 'path',
      json: {
        name: 'utils',
        version: '1.0.0',
        main: 'dist/index.js',
        types: 'dist/index.d.ts',
      },
    });

    expect(await packageDetails('libs/utils')).toEqual({
      packagePath: 'libs/utils',
      packageName: 'utils',
      packageJson: {
        name: 'utils',
        version: '1.0.0',
        main: 'dist/index.js',
        types: 'dist/index.d.ts',
      },
    });
    expect(readJsonFileMock).toHaveBeenCalledWith(
      normalize('libs/utils/package.json'),
    );
  });

  it('should return undefined package name if JSON is empty', async () => {
    const readJsonFileMock = jest.mocked(readJsonFile).mockResolvedValueOnce({
      path: '',
      json: {},
    });

    expect(await packageDetails('')).toEqual({
      packagePath: '',
      packageName: undefined,
      packageJson: {},
    });
    expect(readJsonFileMock).toHaveBeenCalledWith('package.json');
  });
});
