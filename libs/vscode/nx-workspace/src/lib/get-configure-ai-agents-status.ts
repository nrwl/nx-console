import { NxConfigureAiAgentsStatusRequest } from '@nx-console/language-server-types';
import { ConfigureAiAgentsStatus } from '@nx-console/shared-types';
import { getNxlsClient } from '@nx-console/vscode-lsp-client';

export async function getConfigureAiAgentsStatus(): Promise<ConfigureAiAgentsStatus | null> {
  return getNxlsClient().sendRequest(NxConfigureAiAgentsStatusRequest, {});
}
