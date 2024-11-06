import { NxVersionRequest } from '@nx-console/language-server/types';
import { NxVersion } from '@nx-console/shared/types';
import { getNxlsClient } from '@nx-console/vscode/lsp-client';

export async function getNxVersion(): Promise<NxVersion | undefined> {
  return getNxlsClient().sendRequest(NxVersionRequest, undefined);
}
