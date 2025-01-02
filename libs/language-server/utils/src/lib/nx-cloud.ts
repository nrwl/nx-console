import { importNxPackagePath, readNxJson } from '@nx-console/shared-npm';
import type { NxJsonConfiguration } from 'nx/src/devkit-exports';
import { lspLogger } from './lsp-log';

export async function isNxCloudUsed(workspacePath: string): Promise<boolean> {
  const nxJson = await readNxJson(workspacePath);

  let getIsNxCloudUsed: (nxJson: NxJsonConfiguration) => boolean;
  try {
    // try to use nx utils if they exist
    const nxCloudUtils = await importNxPackagePath<
      typeof import('nx/src/utils/nx-cloud-utils')
    >(workspacePath, 'src/utils/nx-cloud-utils', lspLogger);
    getIsNxCloudUsed = nxCloudUtils.isNxCloudUsed;
  } catch (e) {
    // fallback implementation, copied from nx
    getIsNxCloudUsed = (nxJson: NxJsonConfiguration) => {
      if (process.env.NX_NO_CLOUD === 'true' || nxJson.neverConnectToCloud) {
        return false;
      }

      return (
        !!process.env.NX_CLOUD_ACCESS_TOKEN ||
        !!nxJson.nxCloudAccessToken ||
        !!nxJson.nxCloudId ||
        !!Object.values(nxJson.tasksRunnerOptions ?? {}).find(
          (r) => r.runner == '@nrwl/nx-cloud' || r.runner == 'nx-cloud'
        )
      );
    };
  }

  return getIsNxCloudUsed(nxJson);
}
