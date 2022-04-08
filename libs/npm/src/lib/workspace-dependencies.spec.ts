/* eslint-disable @typescript-eslint/no-var-requires */

import { PartialDeep } from 'type-fest';
import { mocked } from 'ts-jest/utils';

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

import * as vscode from 'vscode';
jest.mock('vscode', (): PartialDeep<typeof vscode> => {
  return {
    FileType: {
      Directory: 2,
      SymbolicLink: 64,
    },
    Uri: {
      file: jest.fn((path) => path as any),
    },
    workspace: {
      fs: {
        stat: jest.fn(() =>
          Promise.resolve({
            ctime: 0,
            mtime: 0,
            size: 0,
            type: 2,
          })
        ),
      },
    },
  };
});
const mockedVsCode = mocked(vscode, true);

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

  it('should support symbolic directory links', async () => {
    mockedVsCode.workspace.fs.stat.mockImplementationOnce(() => {
      return Promise.resolve({
        ctime: 0,
        mtime: 0,
        size: 0,
        type: 66,
      });
    });

    const dependencyPath = await workspaceDependencyPath(
      '/workspace',
      '@nrwl/nx'
    );
    expect(dependencyPath).toMatchInlineSnapshot(
      `"/workspace/node_modules/@nrwl/nx"`
    );
  });
});
