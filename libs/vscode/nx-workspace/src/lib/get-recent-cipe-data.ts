import { NxRecentCIPEDataRequest } from '@nx-console/language-server-types';
import { CIPEInfo, CIPEInfoError } from '@nx-console/shared-types';
import { getNxlsClient } from '@nx-console/vscode-lsp-client';

export async function getRecentCIPEData(options?: {
  branch?: string;
}): Promise<{ info?: CIPEInfo[]; error?: CIPEInfoError } | undefined> {
  return await getNxlsClient().sendRequest(NxRecentCIPEDataRequest, options);
}
