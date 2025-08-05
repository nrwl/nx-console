import { IIdeJsonRpcClient } from '@nx-console/shared-types';
import { Logger, testIdeConnection } from '@nx-console/shared-utils';
import { IdeJsonRpcClient } from './json-rpc-client';

export async function createIdeClient(
  workspacePath: string,
  logger?: Logger,
): Promise<{ client: IIdeJsonRpcClient | undefined; available: boolean }> {
  try {
    const ideListening = await testIdeConnection(workspacePath);

    if (!ideListening) {
      return { client: undefined, available: false };
    }

    const client = new IdeJsonRpcClient(workspacePath, logger);

    await client.connect();

    // Verify connection is actually working
    const status = client.getStatus();
    if (status !== 'connected') {
      client.disconnect();
      return { client: undefined, available: false };
    }

    return { client, available: true };
  } catch (error) {
    logger?.log('Failed to create IDE client:', error);
    return { client: undefined, available: false };
  }
}
