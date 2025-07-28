import { importNxPackagePath, readNxJson } from '@nx-console/shared-npm';
import { Logger } from '@nx-console/shared-utils';
import type { NxJsonConfiguration } from 'nx/src/devkit-exports';

export async function isNxCloudUsed(
  workspacePath: string,
  logger?: Logger,
): Promise<boolean> {
  let nxJson: NxJsonConfiguration;
  try {
    nxJson = await readNxJson(workspacePath);
  } catch (e) {
    return false;
  }

  let getIsNxCloudUsed: (nxJson: NxJsonConfiguration) => boolean;
  try {
    // try to use nx utils if they exist
    const nxCloudUtils = await importNxPackagePath<
      typeof import('nx/src/utils/nx-cloud-utils')
    >(workspacePath, 'src/utils/nx-cloud-utils', logger);
    getIsNxCloudUsed = nxCloudUtils.isNxCloudUsed;
  } catch (e) {
    // fallback implementation, copied from nx
    getIsNxCloudUsed = (nxJson: NxJsonConfiguration) => {
      if (process.env.NX_NO_CLOUD === 'true' || nxJson?.neverConnectToCloud) {
        return false;
      }

      // Ensure nxJson exists and tasksRunnerOptions is a valid object
      const tasksRunnerOptions = nxJson?.tasksRunnerOptions;
      const hasCloudRunner = tasksRunnerOptions && typeof tasksRunnerOptions === 'object' && !Array.isArray(tasksRunnerOptions)
        ? !!Object.values(tasksRunnerOptions).find(
            (r) => r?.runner === '@nrwl/nx-cloud' || r?.runner === 'nx-cloud',
          )
        : false;

      return (
        !!process.env.NX_CLOUD_ACCESS_TOKEN ||
        !!nxJson?.nxCloudAccessToken ||
        !!nxJson?.nxCloudId ||
        hasCloudRunner
      );
    };
  }

  return getIsNxCloudUsed(nxJson);
}
