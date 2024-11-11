import { NxProjectGraphOutputRequest } from '@nx-console/language-server/types';
import { getNxlsClient } from '@nx-console/vscode/lsp-client';

export async function getProjectGraphOutput(): Promise<
  | {
      directory: string;
      relativePath: string;
      fullPath: string;
    }
  | undefined
> {
  return getNxlsClient().sendRequest(NxProjectGraphOutputRequest, undefined);
}
