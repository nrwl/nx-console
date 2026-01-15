import * as os from 'os';
import { mocked } from 'jest-mock';
import {
  importWorkspaceDependency,
  workspaceDependencyPath,
} from './workspace-dependencies';
import * as pnpDependencies from './pnp-dependencies';
jest.mock(
  './pnp-dependencies',
  (): Partial<typeof pnpDependencies> => ({
    isWorkspaceInPnp: jest.fn(() => Promise.resolve(false)),
    pnpDependencyPath: jest.fn((workspacePath, dependency) =>
      Promise.resolve(`.yarn/cache${workspacePath}/${dependency}`),
    ),
  }),
);
const mockedPnpDependencies = mocked(pnpDependencies);
import * as fs from '@nx-console/shared-file-system';
import { normalize } from 'path';
jest.mock('@nx-console/shared-file-system', (): Partial<typeof fs> => {
  const original = jest.requireActual('@nx-console/shared-file-system');
  return {
    ...original,
    fileExists: jest.fn(() => Promise.resolve(true)),
    directoryExists: jest.fn(() => Promise.resolve(true)),
  };
});
jest.mock('os', () => {
  const original = jest.requireActual('os');
  return {
    ...original,
    platform: jest.fn(() => 'darwin'),
  };
});
describe('workspace-dependencies', () => {
  describe('workspaceDependencyPath', () => {
    it('should return a path to a workspace dependency when using node_modules', async () => {
      const dependencyPath = await workspaceDependencyPath(
        '/workspace',
        '@nrwl/nx',
      );
      expect(normalize(dependencyPath ?? '')).toEqual(
        normalize('/workspace/node_modules/@nrwl/nx'),
      );
    });
    it('should return a path to a workspace dependency when using yarn pnp', async () => {
      mockedPnpDependencies.isWorkspaceInPnp.mockImplementationOnce(() =>
        Promise.resolve(true),
      );
      const dependencyPath = await workspaceDependencyPath(
        '/workspace',
        '@nrwl/nx',
      );
      expect(normalize(dependencyPath ?? '')).toEqual(
        normalize('.yarn/cache/workspace/@nrwl/nx'),
      );
    });
    it('should return a path to a workspace dependency when the dependency name starts with a `.`', async () => {
      const dependencyPath = await workspaceDependencyPath(
        '/workspace',
        './tools/local/executor',
      );
      expect(normalize(dependencyPath ?? '')).toEqual(
        normalize('/workspace/tools/local/executor'),
      );
    });
  });
  describe('importWorkspaceDependency', () => {
    it('should import workspace dependency and log the path', async () => {
      jest.mock(
        'node_modules/nx/src/utils.js',
        () => ({ utilString: 'util-string' }),
        { virtual: true },
      );
      const logMock = jest.fn();
      expect(
        await importWorkspaceDependency('node_modules/nx/src/utils.js', {
          log: logMock,
          debug: logMock,
        }),
      ).toEqual({ utilString: 'util-string' });
      expect(logMock).toHaveBeenCalledWith(
        'Using local Nx package at node_modules/nx/src/utils.js',
      );
    });
    it('should convert backslashes to forward slashes on Windows', async () => {
      jest.mock(
        'node_modules/nx/src/utils.js',
        () => ({ utilString: 'util-string' }),
        { virtual: true },
      );
      jest.mocked(os.platform).mockReturnValueOnce('win32');
      const logMock = jest.fn();
      expect(
        await importWorkspaceDependency('node_modules\\nx\\src\\utils.js', {
          log: logMock,
          debug: logMock,
        }),
      ).toEqual({ utilString: 'util-string' });
      expect(logMock).toHaveBeenCalledWith(
        'Using local Nx package at node_modules/nx/src/utils.js',
      );
    });
  });
});
