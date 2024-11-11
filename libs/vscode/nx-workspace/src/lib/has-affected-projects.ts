import { NxHasAffectedProjectsRequest } from '@nx-console/language-server/types';
import { getNxlsClient } from '@nx-console/vscode/lsp-client';

export async function hasAffectedProjects(): Promise<boolean | undefined> {
  return await getNxlsClient().sendRequest(
    NxHasAffectedProjectsRequest,
    undefined
  );
}
