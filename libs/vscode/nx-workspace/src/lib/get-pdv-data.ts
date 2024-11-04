import { NxPDVDataRequest } from '@nx-console/language-server/types';
import { PDVData } from '@nx-console/shared/types';
import { getNxlsClient } from '@nx-console/vscode/lsp-client';

export async function getPDVData(
  path: string | undefined
): Promise<PDVData | undefined> {
  return getNxlsClient().sendRequest(NxPDVDataRequest, { filePath: path });
}
