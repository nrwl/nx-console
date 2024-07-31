import { listFiles } from '@nx-console/shared/file-system';
import { existsSync, readFileSync } from 'fs';
import * as os from 'node:os';
import { join } from 'path';

import {
  getNxAccessToken,
  getNxCloudId,
  getNxCloudUrl,
} from '@nx-console/shared/npm';
import { CloudOnboardingInfo } from '@nx-console/shared/types';
import { parse } from 'ini';
import { xhr } from 'request-light';
import { lspLogger } from '@nx-console/language-server/utils';

export async function getCloudOnboardingInfo(
  workspacePath: string
): Promise<CloudOnboardingInfo> {
  const commonCIFileContents = getCommonCIFileContents(workspacePath);
  const hasNxInCI = commonCIFileContents.some((content) =>
    content.includes('nx ')
  );
  const hasAffectedCommandsInCI = commonCIFileContents.some((content) =>
    content.includes('nx affected')
  );

  const accessToken = await getNxAccessToken(workspacePath);
  const nxCloudId = await getNxCloudId(workspacePath);
  const nxCloudUrl = await getNxCloudUrl(workspacePath);
  const isConnectedToCloud = !!(accessToken || nxCloudId);

  const cloudConfigIni = getNxCloudConfigIni();

  const personalAccessToken = cloudConfigIni?.[nxCloudUrl]?.personalAccessToken;

  const isWorkspaceClaimed =
    (await getNxCloudWorkspaceClaimed(
      personalAccessToken,
      nxCloudUrl,
      accessToken,
      nxCloudId
    )) ?? false;

  return {
    hasNxInCI,
    hasAffectedCommandsInCI,
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

function getNxCloudConfigIni(): any | undefined {
  const iniLocation = findExistingNxCloudConfigFile();

  if (iniLocation && existsSync(iniLocation)) {
    try {
      const data = readFileSync(iniLocation, 'utf-8');
      return parse(data);
    } catch (e) {
      return;
    }
  }
}

const NX_CLOUD_CONFIG_DIR_NAME = 'nxcloud';
const NX_CLOUD_CONFIG_FILE_NAME = 'nxcloud.ini';
const DOT_NX_CLOUD_CONFIG_FILE_NAME = `.${NX_CLOUD_CONFIG_FILE_NAME}`;

/*
On Windows, we first check to see if the user has a config file in either
- %LOCALAPPDATA%\nxcloud\nxcloud.ini
- %USERPROFILE%\.nxcloud.ini

For Unix-based systems, we check to see if the user has configured a config either
- $XDG_CONFIG_HOME/nxcloud/nxcloud.ini
- $HOME/.config/nxcloud/nxcloud.ini
- $HOME/.nxcloud.ini
*/
function findExistingNxCloudConfigFile() {
  if (process.platform === 'win32') {
    const homePath = join(os.homedir(), DOT_NX_CLOUD_CONFIG_FILE_NAME);
    if (existsSync(homePath)) {
      return homePath;
    }
    if (process.env.LOCALAPPDATA) {
      const localAppDataPath = join(
        process.env.LOCALAPPDATA,
        NX_CLOUD_CONFIG_DIR_NAME,
        NX_CLOUD_CONFIG_FILE_NAME
      );
      if (existsSync(localAppDataPath)) {
        return localAppDataPath;
      }
    }
  } else {
    if (process.env.XDG_CONFIG_HOME) {
      const xdgPath = join(
        process.env.XDG_CONFIG_HOME,
        NX_CLOUD_CONFIG_DIR_NAME,
        NX_CLOUD_CONFIG_FILE_NAME
      );
      if (existsSync(xdgPath)) {
        return xdgPath;
      }
    }
    const homeDir = os.homedir();
    const homeDotPath = join(homeDir, DOT_NX_CLOUD_CONFIG_FILE_NAME);
    if (existsSync(homeDotPath)) {
      return homeDotPath;
    }
    const homeConfigPath = join(
      homeDir,
      '.config',
      NX_CLOUD_CONFIG_DIR_NAME,
      NX_CLOUD_CONFIG_FILE_NAME
    );
    if (existsSync(homeConfigPath)) {
      return homeConfigPath;
    }
  }
  return null;
}

async function getNxCloudWorkspaceClaimed(
  pat: string | undefined,
  nxCloudUrl: string,
  accessToken: string | undefined,
  nxCloudId: string | undefined
): Promise<boolean | undefined> {
  if (!nxCloudId && !accessToken) {
    return undefined;
  }
  const data = JSON.stringify(
    nxCloudId ? { nxCloudId } : { nxCloudAccessToken: accessToken }
  );

  const url = `${nxCloudUrl}/nx-cloud/is-workspace-claimed`;
  const headers: any = {
    'Content-Type': 'application/json',
  };

  if (pat) {
    headers['Nx-Cloud-Personal-Access-Token'] = pat;
  }

  try {
    const response = await xhr({
      type: 'POST',
      url,
      headers,
      data,
      timeout: 5000,
    });
    return JSON.parse(response.responseText);
  } catch (e) {
    lspLogger.log(JSON.stringify(e, null, 2));
    return undefined;
  }
}
