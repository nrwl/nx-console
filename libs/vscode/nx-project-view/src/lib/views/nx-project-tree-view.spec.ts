import type { ProjectGraphProjectNode } from 'nx/src/devkit-exports';

// vscode is not available in the test runner; provide the enum used by the view.
jest.mock('vscode', () => ({
  TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
}));
jest.mock('@nx-console/vscode-utils', () => ({
  getWorkspacePath: () => '/workspace',
}));
jest.mock('@nx-console/vscode-output-channels', () => ({
  vscodeLogger: { log: jest.fn() },
}));
jest.mock('@nx-console/vscode-nx-workspace', () => ({
  getNxWorkspaceProjects: jest.fn().mockResolvedValue({}),
}));
jest.mock('@nx-console/vscode-lsp-client', () => ({
  WatcherRunningService: { INSTANCE: { status: 'running' } },
}));

import { TreeItemCollapsibleState } from 'vscode';
import { TreeView } from './nx-project-tree-view';

function projectNode(
  name: string,
  root: string,
  targets: Record<string, unknown>,
): ProjectGraphProjectNode {
  return {
    name,
    type: 'lib',
    data: { root, name, targets },
  } as unknown as ProjectGraphProjectNode;
}

describe('TreeView root rendering', () => {
  it('keeps a target-less root project expandable when it has children', async () => {
    // Mirrors a workspace whose root package.json is an inferred project at
    // `.` with no targets, which becomes the singular tree root with the rest
    // of the workspace nested beneath it. Regression test for the projects
    // view rendering it as a non-expandable leaf under Nx 23.
    const rootNode = {
      dir: '.',
      projectName: 'root',
      projectConfiguration: projectNode('root', '.', {}),
      children: ['libs'],
    };
    const libsNode = { dir: 'libs', children: [] as string[] };

    const view = new TreeView();
    view.workspaceData = {} as never;
    view.treeMap = new Map([
      ['.', rootNode],
      ['libs', libsNode],
    ]);
    view.roots = [rootNode];

    const items = await view.getChildren();

    expect(items).toHaveLength(1);
    expect(items![0].contextValue).toBe('project');
    expect(items![0].collapsible).not.toBe(TreeItemCollapsibleState.None);
  });

  it('still renders a target-less project without children as a leaf', async () => {
    const leafNode = {
      dir: '.',
      projectName: 'root',
      projectConfiguration: projectNode('root', '.', {}),
      children: [] as string[],
    };

    const view = new TreeView();
    view.workspaceData = {} as never;
    view.treeMap = new Map([['.', leafNode]]);
    view.roots = [leafNode];

    const items = await view.getChildren();

    expect(items).toHaveLength(1);
    expect(items![0].collapsible).toBe(TreeItemCollapsibleState.None);
  });

  it('shows projects nested under a target-less project inside a folder', async () => {
    // e2es/parent-d is an aggregator project without targets whose child
    // projects live in its subdirectories. It must expand to reveal them.
    const e2esNode = { dir: 'e2es', children: ['e2es/parent-d'] };
    const parentNode = {
      dir: 'e2es/parent-d',
      projectName: 'parent-d-e2e',
      projectConfiguration: projectNode('parent-d-e2e', 'e2es/parent-d', {}),
      children: ['e2es/parent-d/child-a-e2e'],
    };
    const childNode = {
      dir: 'e2es/parent-d/child-a-e2e',
      projectName: 'parent-d-child-a-e2e',
      projectConfiguration: projectNode(
        'parent-d-child-a-e2e',
        'e2es/parent-d/child-a-e2e',
        { e2e: { command: 'echo child-a' } },
      ),
      children: [] as string[],
    };

    const view = new TreeView();
    view.workspaceData = {
      projectGraph: {
        nodes: {
          'parent-d-e2e': parentNode.projectConfiguration,
          'parent-d-child-a-e2e': childNode.projectConfiguration,
        },
      },
    } as never;
    view.treeMap = new Map([
      ['e2es', e2esNode],
      ['e2es/parent-d', parentNode],
      ['e2es/parent-d/child-a-e2e', childNode],
    ]);
    view.roots = [e2esNode];

    const [folder] = (await view.getChildren())!;
    const [parent] = (await view.getChildren(folder))!;

    expect(parent.contextValue).toBe('project');
    expect(parent.label).toBe('parent-d-e2e');
    expect(parent.collapsible).not.toBe(TreeItemCollapsibleState.None);

    const children = await view.getChildren(parent);
    expect(children?.map((item) => item.label)).toContain(
      'parent-d-child-a-e2e',
    );
  });
});
