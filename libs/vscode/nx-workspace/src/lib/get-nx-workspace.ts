import { NxWorkspaceRequest } from '@nx-console/language-server/types';
import { sendRequest } from '@nx-console/vscode/lsp-client';

export function getNxWorkspace(reset?: boolean) {
  return sendRequest(NxWorkspaceRequest, { reset });
}
