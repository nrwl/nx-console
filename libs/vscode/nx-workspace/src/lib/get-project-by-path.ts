import type { ProjectConfiguration } from 'nx/src/devkit-exports';
import {
  NxProjectByPathRequest,
  NxProjectByRootRequest,
} from '@nx-console/language-server/types';
import { getNxlsClient } from '@nx-console/vscode/lsp-client';

export async function getProjectByPath(
  selectedPath: string | undefined
): Promise<ProjectConfiguration | undefined | null> {
  return getNxlsClient().sendRequest(NxProjectByPathRequest, {
    projectPath: selectedPath,
  });
}

export async function getProjectByRoot(
  projectRoot: string
): Promise<ProjectConfiguration | undefined | null> {
  return getNxlsClient().sendRequest(NxProjectByRootRequest, { projectRoot });
}
