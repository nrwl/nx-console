import { NxGeneratorsRequest } from '@nx-console/language-server/types';
import { GetGeneratorsOptions } from '@nx-console/shared/collections';
import { CollectionInfo, WorkspaceProjects } from '@nx-console/shared/schema';
import { sendRequest } from '@nx-console/vscode/lsp-client';

export function getGenerators(
  projects?: WorkspaceProjects,
  options?: GetGeneratorsOptions
): Promise<CollectionInfo[]> {
  return sendRequest(NxGeneratorsRequest, { projects, options });
}
