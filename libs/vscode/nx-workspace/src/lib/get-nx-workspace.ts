import { ProjectConfiguration } from '@nrwl/devkit';
import { NxWorkspaceRequest } from '@nx-console/language-server/types';
import { NxWorkspace } from '@nx-console/shared/types';
import { sendRequest } from '@nx-console/vscode/lsp-client';

export function getNxWorkspace(reset?: boolean): Promise<NxWorkspace> {
  return sendRequest(NxWorkspaceRequest, { reset });
}

// shortcut to reduce repeated destructuring all over the codebase
export async function getNxWorkspaceProjects(reset?: boolean): Promise<{
  [projectName: string]: ProjectConfiguration;
}> {
  const {
    workspace: { projects },
  } = await getNxWorkspace(reset);
  return projects;
}
