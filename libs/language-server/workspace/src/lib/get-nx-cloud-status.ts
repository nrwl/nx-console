import { existsSync } from 'fs';
import { join } from 'path';

import {
  defaultCloudUrl,
  getNxAccessToken,
  getNxCloudId,
  getNxCloudUrl,
} from '@nx-console/shared/npm';

export async function getNxCloudStatus(
  workspaceRoot: string
): Promise<{ isConnected: boolean; nxCloudUrl: string }> {
  const nxJsonPath = join(workspaceRoot, 'nx.json');
  if (!existsSync(nxJsonPath)) {
    return { isConnected: false, nxCloudUrl: defaultCloudUrl };
  }
  if (
    (await getNxAccessToken(workspaceRoot)) ||
    (await getNxCloudId(workspaceRoot))
  ) {
    return {
      isConnected: true,
      nxCloudUrl: await getNxCloudUrl(workspaceRoot),
    };
  }

  return { isConnected: false, nxCloudUrl: defaultCloudUrl };
}
