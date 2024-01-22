import { NxWorkspacePathRequest } from '@nx-console/language-server/types';
import { sendRequest } from '@nx-console/vscode/lsp-client';

export function getNxWorkspacePath(): Promise<string> {
  return sendRequest(NxWorkspacePathRequest, undefined);
}
