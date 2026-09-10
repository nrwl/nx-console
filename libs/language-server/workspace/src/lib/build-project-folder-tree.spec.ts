import type { ProjectGraphProjectNode } from 'nx/src/devkit-exports';
import { buildProjectFolderTree } from './build-project-folder-tree';

function nodes(
  ...roots: [name: string, root: string][]
): Record<string, ProjectGraphProjectNode> {
  return Object.fromEntries(
    roots.map(([name, root]) => [
      name,
      { name, type: 'lib', data: { root } } as ProjectGraphProjectNode,
    ]),
  );
}

describe('buildProjectFolderTree', () => {
  it('nests a project under the folder of its parent directory', () => {
    const { roots, serializedTreeMap } = buildProjectFolderTree(
      nodes(['app', 'apps/app']),
    );

    expect(roots.map((r) => r.dir)).toEqual(['apps']);
    expect(roots[0].projectName).toBeUndefined();
    expect(roots[0].children).toEqual(['apps/app']);
    expect(
      serializedTreeMap.find((e) => e.dir === 'apps/app')?.node.projectName,
    ).toEqual('app');
  });

  it('keeps a top-level project as a project when a nested project is added first', () => {
    const { roots } = buildProjectFolderTree(
      nodes(['child', 'packages/child'], ['aggregator', 'packages']),
    );

    expect(roots).toHaveLength(1);
    expect(roots[0].dir).toEqual('packages');
    expect(roots[0].projectName).toEqual('aggregator');
    expect(roots[0].projectConfiguration).toBeDefined();
    expect(roots[0].children).toEqual(['packages/child']);
  });

  it('does not depend on the order projects arrive in', () => {
    const nested = buildProjectFolderTree(
      nodes(['child', 'packages/child'], ['aggregator', 'packages']),
    );
    const parentFirst = buildProjectFolderTree(
      nodes(['aggregator', 'packages'], ['child', 'packages/child']),
    );

    expect(nested.roots).toEqual(parentFirst.roots);
  });

  it('returns the same node object for a root as for its treeMap entry', () => {
    const { roots, serializedTreeMap } = buildProjectFolderTree(
      nodes(['child', 'packages/child'], ['aggregator', 'packages']),
    );

    expect(roots[0]).toBe(
      serializedTreeMap.find((e) => e.dir === 'packages')?.node,
    );
  });

  it('makes the workspace root project the singular root', () => {
    const { roots } = buildProjectFolderTree(
      nodes(['root', '.'], ['app', 'apps/app'], ['aggregator', 'packages']),
    );

    expect(roots).toHaveLength(1);
    expect(roots[0].dir).toEqual('.');
    expect(roots[0].projectName).toEqual('root');
    expect(roots[0].children).toEqual(['apps', 'packages']);
  });

  it('does not make the workspace root project its own child', () => {
    const { roots } = buildProjectFolderTree(
      nodes(
        ['child', 'packages/child'],
        ['root', '.'],
        ['aggregator', 'packages'],
      ),
    );

    expect(roots[0].children).not.toContain('.');
  });

  it('sorts roots by directory', () => {
    const { roots } = buildProjectFolderTree(
      nodes(['z', 'zed/z'], ['a', 'alpha/a'], ['m', 'mid/m']),
    );

    expect(roots.map((r) => r.dir)).toEqual(['alpha', 'mid', 'zed']);
  });
});
