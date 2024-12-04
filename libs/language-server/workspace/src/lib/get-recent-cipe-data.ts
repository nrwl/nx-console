import { lspLogger } from '@nx-console/language-server/utils';
import {
  getNxAccessToken,
  getNxCloudId,
  getNxCloudUrl,
} from '@nx-console/shared/npm';
import { CIPEInfo, CIPEInfoError } from '@nx-console/shared/types';
import { execSync } from 'child_process';
import { xhr } from 'request-light';
import { getNxCloudConfigIni } from './get-cloud-onboarding-info';

export async function getRecentCIPEData(workspacePath: string): Promise<{
  info?: CIPEInfo[];
  error?: CIPEInfoError;
  workspaceUrl?: string;
}> {
  const branches = getRecentlyCommittedGitBranches(workspacePath);

  const nxCloudUrl = await getNxCloudUrl(workspacePath);
  const nxCloudId = await getNxCloudId(workspacePath);
  const nxCloudConfigIni = getNxCloudConfigIni();

  const personalAccessToken =
    nxCloudConfigIni?.[nxCloudUrl]?.personalAccessToken;

  const data = JSON.stringify({
    branches: branches.map((branch) => branch.name),
  });

  const url = `${nxCloudUrl}/nx-cloud/nx-console/ci-pipeline-executions`;
  const headers: any = {
    'Content-Type': 'application/json',
  };

  if (nxCloudId) {
    headers['Nx-Cloud-Id'] = nxCloudId;
  }
  if (personalAccessToken) {
    headers['Nx-Cloud-Personal-Access-Token'] = personalAccessToken;
  }

  const accessToken = await getNxAccessToken(workspacePath);
  if (accessToken) {
    headers['Authorization'] = accessToken;
  }

  try {
    const response = await xhr({
      type: 'POST',
      url,
      headers,
      data,
      timeout: 5000,
    });
    const responseData = JSON.parse(response.responseText) as {
      ciPipelineExecutions: CIPEInfo[];
      workspaceUrl: string;
    };
    return {
      info: responseData.ciPipelineExecutions,
      workspaceUrl: responseData.workspaceUrl,
    };
  } catch (e) {
    if (e.status === 401) {
      lspLogger.log(`Authentication error: ${e.responseText}`);
      return {
        error: {
          type: 'authentication',
          message: e.responseText,
        },
      };
    }
    lspLogger.log(`Error: ${JSON.stringify(e)}`);
    return {
      error: {
        type: 'other',
        message: e.responseText ?? e.message,
      },
    };
  }
}

function getRecentlyCommittedGitBranches(
  workspacePath: string
): { name: string; time: string }[] {
  try {
    const localUserEmail = execSync('git config user.email').toString().trim();
    const oneWeekAgo = new Date(
      Date.now() - 60 * 60 * 24 * 7 * 1000
    ).toISOString();

    const res = execSync(
      'git for-each-ref --count=10 --sort=-committerdate refs/heads/ --format="%(refname) - %(committerdate:iso-strict) - %(authoremail)"',
      {
        cwd: workspacePath,
      }
    ).toString();

    const branches = res
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => {
        const [refname, time, email] = line
          .split(' - ')
          .map((item) => item.trim());
        return {
          name: refname.replace('refs/heads/', ''),
          time,
          email: email,
        };
      })
      .filter((item) => {
        return item.email.includes(localUserEmail) && item.time >= oneWeekAgo;
      });

    return branches;
  } catch (e) {
    return [];
  }
}
