import { existsSync } from 'fs';
import { join } from 'path';

import {
  defaultCloudUrl,
  getNxAccessToken,
  getNxCloudId,
  getNxCloudUrl,
} from '@nx-console/shared-nx-cloud';

export async function getNxCloudStatus(
  workspaceRoot: string,
): Promise<{ isConnected: boolean; nxCloudUrl: string; nxCloudId?: string }> {
  const nxJsonPath = join(workspaceRoot, 'nx.json');
  if (!existsSync(nxJsonPath)) {
    return { isConnected: false, nxCloudUrl: defaultCloudUrl };
  }
  const nxCloudId = await getNxCloudId(workspaceRoot);
  if ((await getNxAccessToken(workspaceRoot)) || nxCloudId) {
    return {
      isConnected: true,
      nxCloudUrl: await getNxCloudUrl(workspaceRoot),
      nxCloudId,
    };
  }

  return { isConnected: false, nxCloudUrl: defaultCloudUrl };
}
