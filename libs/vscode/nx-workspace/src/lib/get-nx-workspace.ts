import { NxWorkspaceRequest } from '@nx-console/language-server/types';
import { NxWorkspace } from '@nx-console/shared/types';
import { sendRequest } from '@nx-console/vscode/lsp-client';
import type { ProjectConfiguration } from 'nx/src/devkit-exports';

export function getNxWorkspace(
  reset?: boolean
): Promise<NxWorkspace | undefined> {
  return sendRequest(NxWorkspaceRequest, { reset });
}

// shortcuts to reduce repeated destructuring all over the codebase
export async function getNxWorkspaceProjects(reset?: boolean): Promise<{
  [projectName: string]: ProjectConfiguration;
}> {
  const nxWorkspace = await getNxWorkspace(reset);
  if (!nxWorkspace) {
    return {};
  }
  const {
    workspace: { projects },
  } = nxWorkspace;
  return projects;
}
