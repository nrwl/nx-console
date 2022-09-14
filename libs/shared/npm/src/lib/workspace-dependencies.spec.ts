import { PartialDeep } from 'type-fest';
import { mocked } from 'jest-mock';
import { workspaceDependencyPath } from './workspace-dependencies';

import * as pnpDependencies from './pnp-dependencies';
jest.mock(
  './pnp-dependencies',
  (): Partial<typeof pnpDependencies> => ({
    isWorkspaceInPnp: jest.fn(() => Promise.resolve(false)),
    pnpDependencyPath: jest.fn((workspacePath, dependency) =>
      Promise.resolve(`.yarn/cache${workspacePath}/${dependency}`)
    ),
  })
);
const mockedPnpDependencies = mocked(pnpDependencies);

import * as fs from '@nx-console/shared/file-system';
jest.mock('@nx-console/shared/file-system', (): Partial<typeof fs> => {
  const original = jest.requireActual('@nx-console/shared/file-system');
  return {
    ...original,
    fileExists: jest.fn(() => Promise.resolve(true)),
    directoryExists: jest.fn(() => Promise.resolve(true)),
  };
});

describe('workspace-dependencies path', () => {
  it('should return a path to a workspace dependency when using node_modules', async () => {
    const dependencyPath = await workspaceDependencyPath(
      '/workspace',
      '@nrwl/nx'
    );
    expect(dependencyPath).toMatchInlineSnapshot(
      `"/workspace/node_modules/@nrwl/nx"`
    );
  });

  it('should return a path to a workspace dependency when using yarn pnp', async () => {
    mockedPnpDependencies.isWorkspaceInPnp.mockImplementationOnce(() =>
      Promise.resolve(true)
    );
    const dependencyPath = await workspaceDependencyPath(
      '/workspace',
      '@nrwl/nx'
    );
    expect(dependencyPath).toMatchInlineSnapshot(
      `".yarn/cache/workspace/@nrwl/nx"`
    );
  });

  it('should return a path to a workspace dependency when the dependency name starts with a `.`', async () => {
    const dependencyPath = await workspaceDependencyPath(
      '/workspace',
      './tools/local/executor'
    );
    expect(dependencyPath).toMatchInlineSnapshot(
      `"/workspace/tools/local/executor"`
    );
  });
});
