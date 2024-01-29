import { NxSourceMapFilesToProjectMapRequest } from '@nx-console/language-server/types';
import { sendRequest } from '@nx-console/vscode/lsp-client';

export async function getSourceMapFilesToProjectMap(): Promise<
  Record<string, string>
> {
  return sendRequest(NxSourceMapFilesToProjectMapRequest, undefined);
}
