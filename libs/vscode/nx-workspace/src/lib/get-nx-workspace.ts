import { NxWorkspaceRequest } from '@nx-console/language-server-types';
import { NxWorkspace } from '@nx-console/shared-types';
import { getNxlsClient } from '@nx-console/vscode-lsp-client';
import type { ProjectGraphProjectNode } from 'nx/src/devkit-exports';

export function getNxWorkspace(
  reset?: boolean
): Promise<NxWorkspace | undefined> {
  return getNxlsClient().sendRequest(NxWorkspaceRequest, { reset });
}

// shortcuts to reduce repeated destructuring all over the codebase
export async function getNxWorkspaceProjects(
  reset?: boolean
): Promise<Record<string, ProjectGraphProjectNode>> {
  const nxWorkspace = await getNxWorkspace(reset);
  if (!nxWorkspace) {
    return {};
  }
  const { projectGraph } = nxWorkspace;
  return projectGraph.nodes;
}
