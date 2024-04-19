import { NxProjectGraphOutputRequest } from '@nx-console/language-server/types';
import { sendRequest } from '@nx-console/vscode/lsp-client';

export async function getProjectGraphOutput(): Promise<
  | {
      directory: string;
      relativePath: string;
      fullPath: string;
    }
  | undefined
> {
  return sendRequest(NxProjectGraphOutputRequest, undefined);
}
