import { NxWorkspacePathRequest } from '@nx-console/language-server/types';
import { getNxlsClient } from '@nx-console/vscode/lsp-client';

export function getNxWorkspacePathFromNxls(): Promise<string | undefined> {
  return getNxlsClient().sendRequest(NxWorkspacePathRequest, undefined);
}
