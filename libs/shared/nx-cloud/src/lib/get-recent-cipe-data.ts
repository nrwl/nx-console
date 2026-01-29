import { CIPEInfo, CIPEInfoError } from '@nx-console/shared-types';
import { execSync } from 'child_process';
import { isNxCloudUsed } from './is-nx-cloud-used';

import { Logger, httpRequest, HttpError } from '@nx-console/shared-utils';
import { getNxCloudUrl } from './cloud-ids';
import { nxCloudAuthHeaders } from './nx-cloud-auth-headers';

const CACHE_TTL_MS = 5000; // 5 seconds

let lastFetchTimestamp = 0;
let cachedWorkspacePath: string | null = null;
let cachedResult: {
  info?: CIPEInfo[];
  error?: CIPEInfoError;
  workspaceUrl?: string;
} | null = null;

export async function getRecentCIPEData(
  workspacePath: string,
  logger: Logger,
  options?: { branch?: string },
): Promise<{
  info?: CIPEInfo[];
  error?: CIPEInfoError;
  workspaceUrl?: string;
}> {
  const now = Date.now();
  const explicitBranch = options?.branch;

  if (!(await isNxCloudUsed(workspacePath, logger))) {
    return {
      error: {
        type: 'other',
        message: 'Nx Cloud is not used in this workspace',
      },
    };
  }

  // Skip cache when an explicit branch is requested to ensure we always query for it
  if (
    !explicitBranch &&
    cachedResult &&
    now - lastFetchTimestamp < CACHE_TTL_MS &&
    cachedWorkspacePath === workspacePath
  ) {
    logger.log('Returning cached CIPE data');
    return cachedResult;
  }

  const branches = getRecentlyCommittedGitBranches(workspacePath);
  const branchNames = branches.map((branch) => branch.name);

  // Always include the explicit branch if provided, even if not in the git branches list
  if (explicitBranch && !branchNames.includes(explicitBranch)) {
    branchNames.push(explicitBranch);
  }

  const data = JSON.stringify({
    branches: branchNames,
  });
  const nxCloudUrl = await getNxCloudUrl(workspacePath);
  const url = `${nxCloudUrl}/nx-cloud/nx-console/ci-pipeline-executions`;

  const headers: any = {
    'Content-Type': 'application/json',
    ...(await nxCloudAuthHeaders(workspacePath)),
  };

  logger.log(`Making recent CIPE request`);
  try {
    const response = await httpRequest({
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
    const result = {
      info: responseData.ciPipelineExecutions,
      workspaceUrl: responseData.workspaceUrl,
    };

    // Only cache results when no explicit branch is requested
    if (!explicitBranch) {
      cachedResult = result;
      cachedWorkspacePath = workspacePath;
      lastFetchTimestamp = Date.now();
    }

    logger.debug?.(
      `Recent CIPE data fetched successfully: ${JSON.stringify(result)}`,
    );
    return result;
  } catch (e) {
    // HttpError with 401 status = authentication error
    if (e instanceof HttpError && e.status === 401) {
      logger.log(`Authentication error: ${e.responseText}`);
      return {
        error: {
          type: 'authentication',
          message: e.responseText,
        },
      };
    }

    // Non-HttpError from fetch = network error (connection refused, timeout, etc.)
    if (!(e instanceof HttpError)) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      logger.log(`Network error: ${errorMessage}`);
      return {
        error: {
          type: 'network',
          message: errorMessage,
        },
      };
    }

    // Other HttpError statuses = other errors
    logger.log(`Error: ${e.status} ${e.responseText}`);
    return {
      error: {
        type: 'other',
        message: e.responseText,
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
