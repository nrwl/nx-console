import { listFiles } from '@nx-console/shared-file-system';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { isNxCloudUsed, lspLogger } from '@nx-console/language-server-utils';
import { CloudOnboardingInfo } from '@nx-console/shared-types';
import { xhr } from 'request-light';
import {
  getNxAccessToken,
  getNxCloudConfigIni,
  getNxCloudId,
  getNxCloudUrl,
} from '@nx-console/shared-nx-cloud';

export async function getCloudOnboardingInfo(
  workspacePath: string,
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

async function getNxCloudWorkspaceClaimed(
  pat: string | undefined,
  nxCloudUrl: string,
  accessToken: string | undefined,
  nxCloudId: string | undefined,
): Promise<boolean | undefined> {
  if (!nxCloudId && !accessToken) {
    return undefined;
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

  lspLogger.log(`Making claimed request`);
  try {
    const response = await xhr({
      type: 'POST',
      url,
      headers,
      data,
      timeout: 5000,
    });
    return JSON.parse(response.responseText);
  } catch (error) {
    lspLogger.log(
      `Error from ${nxCloudUrl}/nx-cloud/is-workspace-claimed: ${error.responseText}`,
    );
    return undefined;
  }
}
