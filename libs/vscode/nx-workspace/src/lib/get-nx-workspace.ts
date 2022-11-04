import { NxWorkspaceRequest } from '@nx-console/language-server/types';
import { NxWorkspace } from '@nx-console/shared/types';
import { sendRequest } from '@nx-console/vscode/lsp-client';

export function getNxWorkspace(reset?: boolean): Promise<NxWorkspace> {
  return sendRequest(NxWorkspaceRequest, { reset });
}
