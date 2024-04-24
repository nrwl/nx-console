import { NxHasAffectedProjectsRequest } from '@nx-console/language-server/types';
import { sendRequest } from '@nx-console/vscode/lsp-client';

export async function hasAffectedProjects(): Promise<boolean | undefined> {
  return await sendRequest(NxHasAffectedProjectsRequest, undefined);
}
