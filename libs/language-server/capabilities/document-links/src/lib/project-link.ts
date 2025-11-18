import { isStringNode, lspLogger } from '@nx-console/language-server-utils';
import { nxWorkspace } from '@nx-console/shared-nx-workspace-info';
import { fileExists } from '@nx-console/shared-file-system';
import { join } from 'path';
import { ASTNode } from 'vscode-json-languageservice';
import { URI } from 'vscode-uri';

export async function projectLink(
  workingPath: string,
  node: ASTNode,
): Promise<string | undefined> {
  if (!isStringNode(node)) {
    return;
  }

  let projectName = node.value;
  if (projectName.startsWith('!')) {
    projectName = projectName.slice(1);
  }

  const { projectGraph } = await nxWorkspace(workingPath, lspLogger);

  const workspaceProject = projectGraph.nodes[projectName];

  if (!workspaceProject) {
    return;
  }

  const projectRoot = join(workingPath, workspaceProject.data.root);
  const projectJsonPath = join(projectRoot, 'project.json');

  if (await fileExists(projectJsonPath)) {
    return URI.from({
      scheme: 'file',
      path: projectJsonPath,
      fragment: '1',
    }).toString();
  }

  const packageJsonPath = join(projectRoot, 'package.json');

  if (await fileExists(packageJsonPath)) {
    return URI.from({
      scheme: 'file',
      path: packageJsonPath,
      fragment: '1',
    }).toString();
  }

  return;
}
