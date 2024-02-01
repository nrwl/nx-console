import { NxVersionRequest } from '@nx-console/language-server/types';
import { NxVersion } from '@nx-console/shared/types';
import { sendRequest } from '@nx-console/vscode/lsp-client';

export async function getNxVersion(): Promise<NxVersion> {
  return sendRequest(NxVersionRequest, undefined);
}
