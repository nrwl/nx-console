import { NxWorkspacePathRequest } from '@nx-console/language-server/types';
import { sendRequest } from '@nx-console/vscode/lsp-client';

export function getNxWorkspacePathFromNxls(): Promise<string | undefined> {
  return sendRequest(NxWorkspacePathRequest, undefined);
}
