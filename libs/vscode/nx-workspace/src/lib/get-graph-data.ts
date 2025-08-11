import { NxGraphDataRequest } from '@nx-console/language-server-types';
import { GraphDataResult } from '@nx-console/shared-types';
import { getNxlsClient } from '@nx-console/vscode-lsp-client';

export async function getGraphData(): Promise<GraphDataResult | undefined> {
  return getNxlsClient().sendRequest(NxGraphDataRequest, undefined);
}
