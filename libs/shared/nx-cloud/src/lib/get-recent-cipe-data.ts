import { CIPEInfo, CIPEInfoError } from '@nx-console/shared-types';
import { execSync } from 'child_process';
import { xhr } from 'request-light';
import { isNxCloudUsed } from './is-nx-cloud-used';

import { Logger } from '@nx-console/shared-utils';
import { getNxCloudUrl } from './cloud-ids';
import { nxCloudAuthHeaders } from './nx-cloud-auth-headers';

export async function getRecentCIPEData(
  workspacePath: string,
  logger: Logger,
): Promise<{
  info?: CIPEInfo[];
  error?: CIPEInfoError;
  workspaceUrl?: string;
}> {
  if (!(await isNxCloudUsed(workspacePath, logger))) {
    return {
      error: {
        type: 'other',
        message: 'Nx Cloud is not used in this workspace',
      },
    };
  }

  const branches = getRecentlyCommittedGitBranches(workspacePath);

  const data = JSON.stringify({
    branches: branches.map((branch) => branch.name),
  });
  const nxCloudUrl = await getNxCloudUrl(workspacePath);
  const url = `${nxCloudUrl}/nx-cloud/nx-console/ci-pipeline-executions`;

  const headers: any = {
    'Content-Type': 'application/json',
    ...(await nxCloudAuthHeaders(workspacePath)),
  };

  logger.log(`Making recent CIPE request`);
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
      logger.log(`Authentication error: ${e.responseText}`);
      return {
        error: {
          type: 'authentication',
          message: e.responseText,
        },
      };
    }
    // Check for network errors
    if (
      (e.status === 404 || !e.status) &&
      e.responseText &&
      (e.responseText.includes('Unable to connect') ||
        e.responseText.includes('ENOTFOUND') ||
        e.responseText.includes('ETIMEDOUT') ||
        e.responseText.includes('ECONNREFUSED'))
    ) {
      logger.log(`Network error: ${e.responseText}`);
      return {
        error: {
          type: 'network',
          message: e.responseText,
        },
      };
    }
    logger.log(`Error: ${JSON.stringify(e)}`);
    return {
      error: {
        type: 'other',
        message: e.responseText ?? e.message,
      },
    };
  }
}

function getRecentlyCommittedGitBranches(
  workspacePath: string,
): { name: string; time: string }[] {
  try {
    const localUserEmail = execSync('git config user.email').toString().trim();
    const oneWeekAgo = new Date(
      Date.now() - 60 * 60 * 24 * 7 * 1000,
    ).toISOString();
    const ignoredBranches = getIgnoredBranches(workspacePath);

    const res = execSync(
      'git for-each-ref --count=10 --sort=-committerdate refs/heads/ --format="%(refname) - %(committerdate:iso-strict) - %(authoremail)"',
      {
        cwd: workspacePath,
      },
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
        return (
          item.email.includes(localUserEmail) &&
          item.time >= oneWeekAgo &&
          !ignoredBranches.includes(item.name)
        );
      });

    return branches;
  } catch (e) {
    return [];
  }
}

export function getIgnoredBranches(workspacePath: string): string[] {
  const ignoredBranches = [
    'main',
    'master',
    'trunk',
    'next',
    'dev',
    'development',
    'stable',
    'canary',
  ];

  // Check refs/remotes/origin/HEAD
  try {
    const originHead = execSync('git symbolic-ref refs/remotes/origin/HEAD', {
      cwd: workspacePath,
      stdio: 'pipe',
    })
      .toString()
      .trim()
      .replace('refs/remotes/origin/', '');
    if (originHead && !ignoredBranches.includes(originHead)) {
      ignoredBranches.push(originHead);
    }
  } catch (e) {
    // ignore
  }

  // Check refs/remotes/upstream/HEAD
  try {
    const upstreamHead = execSync(
      'git symbolic-ref refs/remotes/upstream/HEAD',
      {
        cwd: workspacePath,
        stdio: 'pipe',
      },
    )
      .toString()
      .trim()
      .replace('refs/remotes/upstream/', '');
    if (upstreamHead && !ignoredBranches.includes(upstreamHead)) {
      ignoredBranches.push(upstreamHead);
    }
  } catch (e) {
    // ignore
  }

  return ignoredBranches;
}
