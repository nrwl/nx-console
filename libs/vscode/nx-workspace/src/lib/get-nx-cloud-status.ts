import { NxCloudStatusRequest } from '@nx-console/language-server/types';
import { getNxlsClient } from '@nx-console/vscode/lsp-client';

export async function getNxCloudStatus(): Promise<
  { isConnected: boolean; nxCloudUrl?: string } | undefined
> {
  return await getNxlsClient().sendRequest(NxCloudStatusRequest, undefined);
}
