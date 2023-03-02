import { NxCreateProjectGraphRequest } from '@nx-console/language-server/types';
import { sendRequest } from '@nx-console/vscode/lsp-client';

export function createProjectGraph() {
  return sendRequest(NxCreateProjectGraphRequest, undefined);
}
