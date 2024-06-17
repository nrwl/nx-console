import { join } from 'path';
import { npmDependencies } from './npm-dependencies';
import { directoryExists, readDirectory } from '@nx-console/shared/file-system';

jest.mock('@nx-console/shared/file-system');

describe('npmDependencies', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return no dependencies if `node_modules` and `.nx/installation/node_modules` do not exist', async () => {
    jest.mocked(directoryExists).mockResolvedValue(false);

    expect(await npmDependencies('workspace')).toEqual([]);
  });

  it('should return dependencies from `node_modules` if `node_modules` exists', async () => {
    jest
      .mocked(directoryExists)
      .mockImplementation((filePath) =>
        Promise.resolve(
          [
            join('workspace', 'node_modules'),
            join('workspace', 'node_modules', 'package-foo'),
            join('workspace', 'node_modules', 'package-bar'),
          ].includes(filePath)
        )
      );
    jest
      .mocked(readDirectory)
      .mockResolvedValue(['package-foo', 'package-bar']);

    expect(await npmDependencies('workspace')).toEqual([
      join('workspace', 'node_modules', 'package-foo'),
      join('workspace', 'node_modules', 'package-bar'),
    ]);
  });

  it('should return dependencies from `.nx/installation/node_modules` if only `.nx/installation/node_modules` exists', async () => {
    jest
      .mocked(directoryExists)
      .mockImplementation((filePath) =>
        Promise.resolve(
          [
            join('workspace', '.nx', 'installation', 'node_modules'),
            join(
              'workspace',
              '.nx',
              'installation',
              'node_modules',
              'package-foo'
            ),
            join(
              'workspace',
              '.nx',
              'installation',
              'node_modules',
              'package-bar'
            ),
          ].includes(filePath)
        )
      );
    jest
      .mocked(readDirectory)
      .mockResolvedValue(['package-foo', 'package-bar']);

    expect(await npmDependencies('workspace')).toEqual([
      join('workspace', '.nx', 'installation', 'node_modules', 'package-foo'),
      join('workspace', '.nx', 'installation', 'node_modules', 'package-bar'),
    ]);
  });

  it('should return packages from `node_modules` if `node_modules` and `.nx/installation/node_modules` exist', async () => {
    jest
      .mocked(directoryExists)
      .mockImplementation((filePath) =>
        Promise.resolve(
          [
            join('workspace', 'node_modules'),
            join('workspace', 'node_modules', 'package-foo'),
            join('workspace', 'node_modules', 'package-bar'),
            join('workspace', '.nx', 'installation', 'node_modules'),
          ].includes(filePath)
        )
      );
    jest
      .mocked(readDirectory)
      .mockResolvedValue(['package-foo', 'package-bar']);

    expect(await npmDependencies('workspace')).toEqual([
      join('workspace', 'node_modules', 'package-foo'),
      join('workspace', 'node_modules', 'package-bar'),
    ]);
  });

  it('should return scoped packages starting with @', async () => {
    jest
      .mocked(directoryExists)
      .mockImplementation((filePath) =>
        Promise.resolve(
          [
            join('workspace', 'node_modules'),
            join('workspace', 'node_modules', '@scope'),
            join('workspace', '.nx', 'installation', 'node_modules'),
          ].includes(filePath)
        )
      );
    jest
      .mocked(readDirectory)
      .mockResolvedValueOnce(['@scope'])
      .mockResolvedValueOnce(['package-foo']);

    expect(await npmDependencies('workspace')).toEqual([
      join('workspace', 'node_modules', '@scope', 'package-foo'),
    ]);
  });
});
