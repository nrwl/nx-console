import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { parse } from 'dotenv';
import { readNxJson } from '@nx-console/shared-npm';

export async function getNxAccessToken(
  workspacePath: string,
): Promise<string | undefined> {
  try {
    const nxJson = await readNxJson(workspacePath);
    return (
      getAccessTokenFromEnv(workspacePath) ??
      nxJson.nxCloudAccessToken ??
      getAccessTokenFromTaskRunnerOptions(nxJson)
    );
  } catch (e) {
    return undefined;
  }
}

export const defaultCloudUrl = 'https://cloud.nx.app';

export async function getNxCloudUrl(workspacePath: string): Promise<string> {
  try {
    const nxJson = await readNxJson(workspacePath);
    return (
      getNxCloudUrlFromEnv(workspacePath) ??
      getNxCloudUrlFromNxJson(nxJson) ??
      defaultCloudUrl
    );
  } catch (e) {
    return defaultCloudUrl;
  }
}

export async function getNxCloudId(
  workspacePath: string,
): Promise<string | undefined> {
  try {
    const nxJson = await readNxJson(workspacePath);
    return nxJson.nxCloudId ?? getCloudIdFromTaskRunnerOptions(nxJson);
  } catch (e) {
    return undefined;
  }
}

function getAccessTokenFromTaskRunnerOptions(nxJson: any): string | undefined {
  if (!nxJson.tasksRunnerOptions) {
    return undefined;
  }
  for (const key in nxJson.tasksRunnerOptions) {
    const taskRunnerOption = nxJson.tasksRunnerOptions?.[key];

    if (
      taskRunnerOption &&
      taskRunnerOption.runner === 'nx-cloud' &&
      taskRunnerOption.options?.accessToken
    ) {
      return taskRunnerOption.options.accessToken;
    }
  }

  return undefined;
}

function getCloudIdFromTaskRunnerOptions(nxJson: any): string | undefined {
  if (!nxJson.tasksRunnerOptions) {
    return undefined;
  }
  for (const key in nxJson.tasksRunnerOptions) {
    const taskRunnerOption = nxJson.tasksRunnerOptions?.[key];

    if (
      taskRunnerOption &&
      taskRunnerOption.runner === 'nx-cloud' &&
      taskRunnerOption.options?.nxCloudId
    ) {
      return taskRunnerOption.options.nxCloudId;
    }
  }

  return undefined;
}

function getAccessTokenFromEnv(workspaceRoot: string): string | undefined {
  try {
    const cloudEnvPath = join(workspaceRoot, 'nx-cloud.env');
    if (!existsSync(cloudEnvPath)) {
      return undefined;
    }
    const envContents = readFileSync(cloudEnvPath, 'utf-8');
    const cloudEnv = parse(envContents);
    return (
      process.env.NX_CLOUD_AUTH_TOKEN ??
      process.env.NX_CLOUD_ACCESS_TOKEN ??
      cloudEnv.NX_CLOUD_AUTH_TOKEN ??
      cloudEnv.NX_CLOUD_ACCESS_TOKEN
    );
  } catch (e) {
    return undefined;
  }
}

function getNxCloudUrlFromNxJson(nxJson: any): string | undefined {
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

function getNxCloudUrlFromEnv(workspaceRoot: string): string | undefined {
  const cloudEnvPath = join(workspaceRoot, 'nx-cloud.env');
  if (!existsSync(cloudEnvPath)) {
    return undefined;
  }
  const envContents = readFileSync(cloudEnvPath, 'utf-8');
  const cloudEnv = parse(envContents);
  return process.env.NX_CLOUD_API || cloudEnv.NX_CLOUD_API;
}
