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
});
