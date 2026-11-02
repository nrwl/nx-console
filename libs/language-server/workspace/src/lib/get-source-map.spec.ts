import { join } from 'path';
import type { ProjectGraph } from 'nx/src/devkit-exports';

jest.mock('@nx-console/language-server-utils', () => ({
  lspLogger: { log: jest.fn() },
}));

const sourceMaps: Record<string, Record<string, [string | null, string]>> = {};
const projectGraph: ProjectGraph = { nodes: {}, dependencies: {} };
jest.mock('@nx-console/shared-nx-workspace-info', () => ({
  nxWorkspace: jest.fn(() => Promise.resolve({ sourceMaps, projectGraph })),
}));

import {
  getSourceMapFilesToProjectsMap,
  getTargetsForConfigFile,
  resetSourceMapFilesToProjectCache,
} from './get-source-map';

const workspacePath = join('/', 'workspace');

describe('source map file paths', () => {
  beforeEach(() => {
    resetSourceMapFilesToProjectCache();
    for (const key of Object.keys(sourceMaps)) delete sourceMaps[key];
    projectGraph.nodes = {};
  });

  it('excludes nx.json target-default fragments containing Windows-invalid characters', async () => {
    sourceMaps['apps/demo'] = {
      'targets.build': ['nx.json#targetDefaults.@nx/next:build', 'nx/core'],
      'targets.serve': [
        'nx.json#targetDefaults.@angular/build:application',
        'nx/core',
      ],
      'targets.test': ['nx.json', 'nx/core'],
      root: ['apps/demo/project.json', 'nx/core'],
      name: [null, 'nx/core'],
    };

    expect(await getSourceMapFilesToProjectsMap(workspacePath)).toEqual({
      'apps/demo/project.json': ['apps/demo'],
    });
  });

  it('preserves literal hash characters and deduplicates shared configuration paths', async () => {
    sourceMaps['apps/first'] = {
      'targets.build': ['tools/shared#config.json', 'fixture'],
      'targets.test': ['tools/shared#config.json', 'fixture'],
      root: ['tools/shared#config.json', 'fixture'],
    };
    sourceMaps['apps/second'] = {
      'targets.build': ['tools/shared#config.json', 'fixture'],
    };

    expect(await getSourceMapFilesToProjectsMap(workspacePath)).toEqual({
      'tools/shared#config.json': ['apps/first', 'apps/second'],
    });
  });

  it('matches synthetic target-default sources to nx.json and preserves literal hash paths', async () => {
    const build = {
      executor: 'nx:run-commands',
      options: { command: 'echo build' },
    };
    const test = {
      executor: 'nx:run-commands',
      options: { command: 'echo test' },
    };
    projectGraph.nodes.demo = {
      name: 'demo',
      type: 'app',
      data: { root: 'apps/demo', targets: { build, test } },
    };
    sourceMaps['apps/demo'] = {
      'targets.build': ['nx.json#targetDefaults.nx:run-commands', 'nx/core'],
      'targets.test': ['tools/shared#config.json', 'fixture'],
      'targets.unknown': ['nx.json#targetDefaults.unknown', 'fixture'],
      name: ['nx.json', 'nx/core'],
    };

    expect(
      await getTargetsForConfigFile(
        'demo',
        join(workspacePath, 'nx.json'),
        workspacePath,
      ),
    ).toEqual({ build });
    expect(
      await getTargetsForConfigFile(
        'demo',
        'tools/shared#config.json',
        workspacePath,
      ),
    ).toEqual({ test });
  });
});
