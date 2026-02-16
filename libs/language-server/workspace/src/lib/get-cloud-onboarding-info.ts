import { listFiles } from '@nx-console/shared-file-system';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { isNxCloudUsed, lspLogger } from '@nx-console/language-server-utils';
import { CloudOnboardingInfo } from '@nx-console/shared-types';
import {
  getNxAccessToken,
  getNxCloudConfigIni,
  getNxCloudId,
  getNxCloudUrl,
  nxCloudRequest,
} from '@nx-console/shared-nx-cloud';

export async function getCloudOnboardingInfo(
  workspacePath: string,
  force = false,
): Promise<CloudOnboardingInfo> {
  const commonCIFileContents = getCommonCIFileContents(workspacePath);
  const hasNxInCI = commonCIFileContents.some((content) =>
    content.includes('nx '),
  );

  if (!(await isNxCloudUsed(workspacePath))) {
    return {
      hasNxInCI,
      isConnectedToCloud: false,
      isWorkspaceClaimed: false,
      personalAccessToken: undefined,
    };
  }

  const accessToken = await getNxAccessToken(workspacePath);
  const nxCloudId = await getNxCloudId(workspacePath);
  const nxCloudUrl = await getNxCloudUrl(workspacePath);
  const isConnectedToCloud = !!(accessToken || nxCloudId);

  const cloudConfigIni = getNxCloudConfigIni();

  const personalAccessToken = cloudConfigIni?.[nxCloudUrl]?.personalAccessToken;

  const isWorkspaceClaimed = await getNxCloudWorkspaceClaimed(
    personalAccessToken,
    nxCloudUrl,
    accessToken,
    nxCloudId,
    force,
  );

  return {
    hasNxInCI,
    isConnectedToCloud,
    isWorkspaceClaimed,
    personalAccessToken,
  };
}

function getCommonCIFileContents(workspacePath: string): string[] {
  const fileContents: string[] = [];

  const azurePipelines = join(workspacePath, 'azure-pipelines.yml');
  if (existsSync(azurePipelines)) {
    fileContents.push(readFileSync(azurePipelines, 'utf-8'));
  }

  const bitbucketPipelines = join(workspacePath, 'bitbucket-pipelines.yml');
  if (existsSync(bitbucketPipelines)) {
    fileContents.push(readFileSync(bitbucketPipelines, 'utf-8'));
  }

  const gitlabCI = join(workspacePath, '.gitlab-ci.yml');
  if (existsSync(gitlabCI)) {
    fileContents.push(readFileSync(gitlabCI, 'utf-8'));
  }

  const cicleCiFolder = join(workspacePath, '.circleci');
  if (existsSync(cicleCiFolder)) {
    const files = listFiles(cicleCiFolder);
    files
      .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
      .forEach((file) => {
        fileContents.push(readFileSync(file, 'utf-8'));
      });
  }

  const githubFolder = join(workspacePath, '.github');
  if (existsSync(githubFolder)) {
    const files = listFiles(githubFolder);
    files
      .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
      .forEach((file) => {
        fileContents.push(readFileSync(file, 'utf-8'));
      });
  }

  return fileContents;
}

// the claimed status changes rarely so we can cache the result if the args are the same and avoid pinging the api constantly
// if force is true, we should ignore the cache
// the cache should be valid for 5 minutes
let lastRequestTime = 0;
let lastRequestHash = '';
let lastRequestResult: boolean | undefined;

async function getNxCloudWorkspaceClaimed(
  pat: string | undefined,
  nxCloudUrl: string,
  accessToken: string | undefined,
  nxCloudId: string | undefined,
  force,
): Promise<boolean | undefined> {
  if (!nxCloudId && !accessToken) {
    return undefined;
  }

  const requestHash = JSON.stringify({
    pat,
    nxCloudUrl,
    accessToken,
    nxCloudId,
  });

  // if the claimed status ever changes to true, it will stay like this forever
  if (requestHash === lastRequestHash && lastRequestResult === true) {
    lspLogger.log(`Returning cached true result for claimed request`);
    return true;
  }

  if (
    !force &&
    lastRequestHash === requestHash &&
    lastRequestResult !== undefined &&
    Date.now() - lastRequestTime < 5 * 60 * 1000
  ) {
    lspLogger.log(
      `Returning cached result for claimed request: ${lastRequestResult}`,
    );
    return lastRequestResult;
  }

  const data = JSON.stringify(
    nxCloudId ? { nxCloudId } : { nxCloudAccessToken: accessToken },
  );

  const url = `${nxCloudUrl}/nx-cloud/is-workspace-claimed`;
  const headers: any = {
    'Content-Type': 'application/json',
  };

  if (pat) {
    headers['Nx-Cloud-Personal-Access-Token'] = pat;
  }

  try {
    lastRequestTime = Date.now();
    lastRequestHash = requestHash;

    const response = await nxCloudRequest('IS_WORKSPACE_CLAIMED', {
      type: 'POST',
      url,
      headers,
      data,
      timeout: 5000,
    });
    lastRequestResult = JSON.parse(response.responseText);
    return lastRequestResult;
  } catch (error) {
    lspLogger.log(`Error from is-workspace-claimed: ${JSON.stringify(error)}`);
    lastRequestResult = undefined;
    return undefined;
  }
}
