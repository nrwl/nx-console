import { IIdeJsonRpcClient } from '@nx-console/shared-types';
import { Logger, testIdeConnection } from '@nx-console/shared-utils';
import { IdeJsonRpcClient } from './json-rpc-client';

/**
 * Factory function to create and connect an IDE client
 */
export async function createIdeClient(
  workspacePath: string,
  logger?: Logger,
): Promise<{ client: IIdeJsonRpcClient | undefined; available: boolean }> {
  try {
    // Check if IDE is actually listening on the socket
    const ideListening = await testIdeConnection(workspacePath);

    if (!ideListening) {
      return { client: undefined, available: false };
    }

    // Create and connect client
    const client = new IdeJsonRpcClient(workspacePath, 2000, 5, 5000, logger);

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
