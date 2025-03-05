import { NxVersionRequest } from '@nx-console/language-server-types';
import { NxVersion } from '@nx-console/nx-version';
import { getNxlsClient } from '@nx-console/vscode-lsp-client';

export async function getNxVersion(
  reset = false,
): Promise<NxVersion | undefined> {
  return getNxlsClient().sendRequest(NxVersionRequest, { reset });
}
