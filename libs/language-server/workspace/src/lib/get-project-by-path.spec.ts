import { join } from 'path';

jest.mock('@nx-console/language-server-utils', () => ({
  lspLogger: { log: jest.fn() },
}));

const directories = new Set<string>();
jest.mock('@nx-console/shared-file-system', () => ({
  directoryExists: jest.fn((path: string) =>
    Promise.resolve(directories.has(path)),
  ),
}));

const nodes: Record<string, { data: { name: string; root: string } }> = {};
const projectFileMap: Record<string, { file: string }[]> = {};
jest.mock('@nx-console/shared-nx-workspace-info', () => ({
  nxWorkspace: jest.fn(() =>
    Promise.resolve({ projectGraph: { nodes }, projectFileMap }),
  ),
}));

import { getProjectByPath, getProjectsByPaths } from './get-project-by-path';

const workspacePath = join('/', 'workspace');

function addProject(name: string, root: string, files: string[]) {
  nodes[name] = { data: { name, root } };
  projectFileMap[name] = files.map((file) => ({ file }));
}

describe('getProjectsByPaths', () => {
  beforeEach(() => {
    directories.clear();
    for (const key of Object.keys(nodes)) delete nodes[key];
    for (const key of Object.keys(projectFileMap)) delete projectFileMap[key];

    // the outer project comes first in the graph, the nested one after it
    addProject('parent', 'e2es/parent', ['e2es/parent/project.json']);
    addProject('parent-sub', 'e2es/parent/sub', [
      'e2es/parent/sub/project.json',
      'e2es/parent/sub/src/index.ts',
    ]);
    directories.add(join(workspacePath, 'e2es/parent'));
    directories.add(join(workspacePath, 'e2es/parent/sub'));
    directories.add(join(workspacePath, 'e2es/parent/sub/src'));
  });

  it('should return the nested project for a directory inside it', async () => {
    const project = await getProjectByPath(
      join(workspacePath, 'e2es/parent/sub/src'),
      workspacePath,
    );
    expect(project?.name).toEqual('parent-sub');
  });

  it('should return the nested project for its root directory', async () => {
    const project = await getProjectByPath(
      join(workspacePath, 'e2es/parent/sub'),
      workspacePath,
    );
    expect(project?.name).toEqual('parent-sub');
  });

  it('should still return the outer project for its own directory', async () => {
    const project = await getProjectByPath(
      join(workspacePath, 'e2es/parent'),
      workspacePath,
    );
    expect(project?.name).toEqual('parent');
  });

  it('should resolve files and directories in one call', async () => {
    const subSrc = join(workspacePath, 'e2es/parent/sub/src');
    const subIndex = join(workspacePath, 'e2es/parent/sub/src/index.ts');
    const parentDir = join(workspacePath, 'e2es/parent');
    const projects = await getProjectsByPaths(
      [subSrc, subIndex, parentDir],
      workspacePath,
    );
    expect(projects?.[subSrc]?.name).toEqual('parent-sub');
    expect(projects?.[subIndex]?.name).toEqual('parent-sub');
    expect(projects?.[parentDir]?.name).toEqual('parent');
  });
});
