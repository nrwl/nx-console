import { lspLogger } from '@nx-console/language-server-utils';
import { getNxDaemonClient } from '@nx-console/shared-nx-workspace-info';
import type { ConfigureAiAgentsStatusResponse } from 'nx/src/daemon/message-types/configure-ai-agents';

export async function getConfigureAiAgentsStatus(
  workspacePath: string,
): Promise<ConfigureAiAgentsStatusResponse | null> {
  try {
    const daemonClientModule = await getNxDaemonClient(
      workspacePath,
      lspLogger,
    );

    if (!daemonClientModule?.daemonClient) {
      lspLogger.log(
        'Daemon client not available for configure-ai-agents status',
      );
      return null;
    }

    if (
      typeof daemonClientModule.daemonClient.getConfigureAiAgentsStatus !==
      'function'
    ) {
      lspLogger.log(
        'getConfigureAiAgentsStatus not available on daemon client (nx version too old)',
      );
      return null;
    }

    return await daemonClientModule.daemonClient.getConfigureAiAgentsStatus();
  } catch (e) {
    lspLogger.log(`Error getting configure-ai-agents status: ${e}`);
    return null;
  }
}
