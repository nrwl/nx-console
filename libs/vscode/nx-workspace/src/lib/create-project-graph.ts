import { NxCreateProjectGraphRequest } from '@nx-console/language-server/types';
import { getNxlsClient } from '@nx-console/vscode/lsp-client';

export function createProjectGraph(showAffected = false) {
  return getNxlsClient().sendRequest(NxCreateProjectGraphRequest, {
    showAffected,
  });
}
