import { ProjectConfiguration } from 'nx/src/devkit-exports';
import {
  NxProjectByPathRequest,
  NxProjectByRootRequest,
} from '@nx-console/language-server/types';
import { sendRequest } from '@nx-console/vscode/lsp-client';

export async function getProjectByPath(
  selectedPath: string | undefined
): Promise<ProjectConfiguration | null> {
  return sendRequest(NxProjectByPathRequest, { projectPath: selectedPath });
}

export async function getProjectByRoot(
  projectRoot: string
): Promise<ProjectConfiguration | null> {
  return sendRequest(NxProjectByRootRequest, { projectRoot });
}
