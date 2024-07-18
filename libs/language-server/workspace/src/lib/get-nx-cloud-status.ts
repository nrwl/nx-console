import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'dotenv';
import { readNxJson } from '@nx-console/language-server/utils';

export async function getNxCloudStatus(
  workspaceRoot: string
): Promise<{ isConnected: boolean; nxCloudUrl?: string }> {
  const nxJsonPath = join(workspaceRoot, 'nx.json');
  if (!existsSync(nxJsonPath)) {
    return { isConnected: false };
  }
  try {
    const nxJson = await readNxJson(workspaceRoot);
    if (
      nxJson.nxCloudAccessToken ||
      checkForCloudInTaskRunnerOptions(nxJson) ||
      checkForCloudInEnv(workspaceRoot)
    ) {
      return {
        isConnected: true,
        nxCloudUrl:
          getCloudUrlFromNxJson(nxJson) ??
          getCloudUrlFromEnv(workspaceRoot) ??
          'https://cloud.nx.app',
      };
    }
  } catch (e) {
    // do nothing
  }
  return { isConnected: false };
}

function checkForCloudInTaskRunnerOptions(nxJson: any) {
  if (!nxJson.tasksRunnerOptions) {
    return false;
  }
  for (const key in nxJson.tasksRunnerOptions) {
    const taskRunnerOption = nxJson.tasksRunnerOptions?.[key];

    if (
      taskRunnerOption &&
      taskRunnerOption.runner === 'nx-cloud' &&
      taskRunnerOption.options?.accessToken
    ) {
      return true;
    }
  }

  return false;
}

function checkForCloudInEnv(workspaceRoot: string) {
  const cloudEnvPath = join(workspaceRoot, 'nx-cloud.env');
  if (!existsSync(cloudEnvPath)) {
    return false;
  }
  const envContents = readFileSync(cloudEnvPath, 'utf-8');
  const cloudEnv = parse(envContents);
  return (
    process.env.NX_CLOUD_AUTH_TOKEN ||
    process.env.NX_CLOUD_ACCESS_TOKEN ||
    cloudEnv.NX_CLOUD_AUTH_TOKEN ||
    cloudEnv.NX_CLOUD_ACCESS_TOKEN
  );
}

function getCloudUrlFromNxJson(nxJson: any): string | undefined {
  if (nxJson.nxCloudUrl) {
    return nxJson.nxCloudUrl;
  }
  for (const key in nxJson.tasksRunnerOptions) {
    const taskRunnerOption = nxJson.tasksRunnerOptions?.[key];
    if (
      taskRunnerOption &&
      taskRunnerOption.runner === 'nx-cloud' &&
      taskRunnerOption.options?.accessToken &&
      taskRunnerOption.options?.url
    ) {
      return taskRunnerOption.options.url;
    }
  }
}

function getCloudUrlFromEnv(workspaceRoot: string): string | undefined {
  const cloudEnvPath = join(workspaceRoot, 'nx-cloud.env');
  if (!existsSync(cloudEnvPath)) {
    return undefined;
  }
  const envContents = readFileSync(cloudEnvPath, 'utf-8');
  const cloudEnv = parse(envContents);
  return process.env.NX_CLOUD_API || cloudEnv.NX_CLOUD_API;
}
