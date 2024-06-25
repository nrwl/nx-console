import { NxCloudStatusRequest } from '@nx-console/language-server/types';
import { sendRequest } from '@nx-console/vscode/lsp-client';

export async function getNxCloudStatus(): Promise<
  { isConnected: boolean; nxCloudUrl?: string } | undefined
> {
  return await sendRequest(NxCloudStatusRequest, undefined);
}
