import { NxConfigureAiAgentsStatusRequest } from '@nx-console/language-server-types';
import type { ConfigureAiAgentsStatusResponse } from 'nx/src/daemon/message-types/configure-ai-agents';
import { getNxlsClient } from '@nx-console/vscode-lsp-client';

export async function getConfigureAiAgentsStatus(): Promise<ConfigureAiAgentsStatusResponse | null> {
  return getNxlsClient().sendRequest(NxConfigureAiAgentsStatusRequest, {});
}
