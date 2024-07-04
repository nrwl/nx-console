import { join } from 'path';
import { NxlsWrapper } from '../nxls-wrapper';
import {
  defaultVersion,
  e2eCwd,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
  waitFor,
} from '../utils';
import {
  NxProjectFolderTreeRequest,
  NxWorkspaceRefreshNotification,
} from '@nx-console/language-server/types';
import { TreeMap, TreeNode } from '@nx-console/shared/types';
import { mkdirSync, writeFileSync } from 'fs';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');

describe('project folder tree', () => {
  beforeAll(async () => {
    newWorkspace({
      name: workspaceName,
      options: simpleReactWorkspaceOptions,
      version: defaultVersion,
    });

    nxlsWrapper = new NxlsWrapper();
    await nxlsWrapper.startNxls(join(e2eCwd, workspaceName));
    nxlsWrapper.setVerbose(true);
  });

  it('should contain base projects with correct information', async () => {
    const projectFolderTree = await getProjectFolderTree();

    expect([...projectFolderTree.treeMap.keys()]).toEqual(['e2e', '.']);

    expect(projectFolderTree.roots.length).toEqual(1);
    expect(projectFolderTree.roots[0].dir).toEqual('.');
    expect(projectFolderTree.roots[0].projectName).toEqual(workspaceName);
  });

  it('should contain projects & folder nodes for project in subfolder', async () => {
    const projectFolder = join(e2eCwd, workspaceName, 'subfolder', 'project');
    mkdirSync(projectFolder, { recursive: true });
    writeFileSync(join(projectFolder, 'project.json'), '{ "name": "project" }');

    await waitFor(1000);

    const projectFolderTree = await getProjectFolderTree();

    expect(projectFolderTree.treeMap.size).toEqual(4);

    const subfolderNode = projectFolderTree.treeMap.get('subfolder');

    expect(subfolderNode).toBeDefined();
    expect(subfolderNode?.projectConfiguration).toBeUndefined();
    expect(subfolderNode?.projectName).toBeUndefined();
    expect(subfolderNode?.dir).toEqual('subfolder');
    expect(subfolderNode?.children.length).toEqual(1);
    expect(subfolderNode?.children[0]).toEqual('subfolder/project');

    const subfolderProjectNode =
      projectFolderTree.treeMap.get('subfolder/project');
    expect(subfolderProjectNode).toBeDefined();
    expect(subfolderProjectNode?.projectName).toEqual('project');
    expect(subfolderProjectNode?.projectConfiguration).toBeDefined();
    expect(subfolderProjectNode?.dir).toEqual('subfolder/project');
    expect(subfolderProjectNode?.children.length).toEqual(0);

    // other properties unchanged
    expect(projectFolderTree.treeMap.get('e2e')).toBeDefined();
    expect(projectFolderTree.treeMap.get('.')).toBeDefined();
    expect(projectFolderTree.roots.length).toEqual(1);
    expect(projectFolderTree.roots[0].dir).toEqual('.');
  });

  it('should contain projects & folder info for nested projects', async () => {
    const nestedProjectFolder = join(
      e2eCwd,
      workspaceName,
      'subfolder',
      'project',
      'nested'
    );
    mkdirSync(nestedProjectFolder, { recursive: true });
    writeFileSync(
      join(nestedProjectFolder, 'project.json'),
      '{ "name": "nested" }'
    );

    await waitFor(1000);

    const projectFolderTree = await getProjectFolderTree();

    expect(projectFolderTree.treeMap.size).toEqual(5);

    const subfolderProjectNode =
      projectFolderTree.treeMap.get('subfolder/project');

    expect(subfolderProjectNode).toBeDefined();
    expect(subfolderProjectNode?.projectName).toEqual('project');
    expect(subfolderProjectNode?.projectConfiguration).toBeDefined();
    expect(subfolderProjectNode?.dir).toEqual('subfolder/project');
    expect(subfolderProjectNode?.children.length).toEqual(1);
    expect(subfolderProjectNode?.children[0]).toEqual(
      'subfolder/project/nested'
    );

    const subfolderNestedProjectNode = projectFolderTree.treeMap.get(
      'subfolder/project/nested'
    );

    expect(subfolderNestedProjectNode).toBeDefined();
    expect(subfolderNestedProjectNode?.projectName).toEqual('nested');
    expect(subfolderNestedProjectNode?.projectConfiguration).toBeDefined();
    expect(subfolderNestedProjectNode?.dir).toEqual('subfolder/project/nested');
    expect(subfolderNestedProjectNode?.children.length).toEqual(0);

    // other properties unchanged

    expect(projectFolderTree.treeMap.get('e2e')).toBeDefined();
    expect(projectFolderTree.treeMap.get('.')).toBeDefined();
    expect(projectFolderTree.treeMap.get('subfolder')).toBeDefined();
  });

  it('should contain projects & folder info for deeply nested projects', async () => {
    const deeplyNestedProjectFolder = join(
      e2eCwd,
      workspaceName,
      'subfolder',
      'project',
      'subsubfolder',
      'deeplynested'
    );
    mkdirSync(deeplyNestedProjectFolder, { recursive: true });
    writeFileSync(
      join(deeplyNestedProjectFolder, 'project.json'),
      '{ "name": "deeplynested" }'
    );

    await waitFor(1000);

    const projectFolderTree = await getProjectFolderTree();

    expect(projectFolderTree.treeMap.size).toEqual(7);

    expect(
      projectFolderTree.treeMap.get('subfolder/project')?.children
    ).toEqual(['subfolder/project/subsubfolder', 'subfolder/project/nested']);

    const subsubfolderNode = projectFolderTree.treeMap.get(
      'subfolder/project/subsubfolder'
    );
    expect(subsubfolderNode?.children).toEqual([
      'subfolder/project/subsubfolder/deeplynested',
    ]);
    expect(subsubfolderNode?.projectName).toBeUndefined();
    expect(subsubfolderNode?.projectConfiguration).toBeUndefined();

    const deeplyNested = projectFolderTree.treeMap.get(
      'subfolder/project/subsubfolder/deeplynested'
    );
    expect(deeplyNested).toBeDefined();
    expect(deeplyNested?.projectName).toEqual('deeplynested');
    expect(deeplyNested?.projectConfiguration).toBeDefined();
    expect(deeplyNested?.dir).toEqual(
      'subfolder/project/subsubfolder/deeplynested'
    );
    expect(deeplyNested?.children.length).toEqual(0);
  });

  afterAll(async () => {
    return await nxlsWrapper.stopNxls();
  });
});

// both vscode & intellij do this mapping to reconstruct a map from the array of nodes
async function getProjectFolderTree(): Promise<{
  treeMap: TreeMap;
  roots: TreeNode[];
}> {
  const res = (
    await nxlsWrapper.sendRequest({
      ...NxProjectFolderTreeRequest,
      params: {},
    })
  ).result as {
    serializedTreeMap: { dir: string; node: TreeNode }[];
    roots: TreeNode[];
  };

  return {
    treeMap: new Map(res.serializedTreeMap.map((n) => [n.dir, n.node])),
    roots: res.roots,
  };
}
