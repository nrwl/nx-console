// THIS ENTIRE LOGIC IS COPIED FROM THE NX REPO
// WE SHOULD CONSIDER MOVING THIS TO THE LIGHT CLIENT AND REUSING IT

import { getOutputChannel } from '@nx-console/vscode-output-channels';
import { vscodeLogger } from '@nx-console/vscode-utils';
import { execSync } from 'child_process';

export async function createNxCloudOnboardingURL(
  onboardingSource: string,
  accessToken?: string,
  meta?: string,
  forceManual = false,
  forceGithub = false,
) {
  const remoteInfo = getVcsRemoteInfo();
  const apiUrl = getCloudUrl();

  const installationSupportsGitHub =
    await getInstallationSupportsGitHub(apiUrl);

  let usesGithub = false;
  if (forceGithub) {
    usesGithub = installationSupportsGitHub;
  } else if (forceManual) {
    usesGithub = false;
  } else {
    usesGithub =
      remoteInfo?.domain === 'github.com' && installationSupportsGitHub;
  }
  const source = getSource(onboardingSource);
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const response = await require('axios').post(
      `${apiUrl}/nx-cloud/onboarding`,
      {
        type: usesGithub ? 'GITHUB' : 'MANUAL',
        source,
        accessToken: usesGithub ? null : accessToken,
        selectedRepositoryName: remoteInfo?.slug ?? null,
        repositoryDomain: remoteInfo?.domain ?? null,
        meta,
      },
    );

    if (!response?.data || response.data.message) {
      throw new Error(
        response?.data?.message ?? 'Failed to shorten Nx Cloud URL',
      );
    }

    return `${apiUrl}/connect/${response.data}`;
  } catch (e) {
    vscodeLogger.log(`Failed to shorten Nx Cloud URL.
    ${e}`);
    return getURLifShortenFailed(
      usesGithub,
      usesGithub ? remoteInfo?.slug : null,
      apiUrl,
      source,
      accessToken,
    );
  }
}

function getSource(
  installationSource: string,
): 'nx-init' | 'nx-connect' | string {
  if (installationSource.includes('nx-init')) {
    return 'nx-init';
  } else if (installationSource.includes('nx-connect')) {
    return 'nx-connect';
  } else {
    return installationSource;
  }
}

/* eslint-disable no-useless-escape */
export interface VcsRemoteInfo {
  domain: string;
  slug: string;
}

export function parseVcsRemoteUrl(url: string): VcsRemoteInfo | null {
  // Remove whitespace and handle common URL formats
  const cleanUrl = url.trim();

  // SSH format: git@domain:owner/repo.git
  const sshMatch = cleanUrl.match(/^git@([^:]+):([^\/]+)\/(.+?)(\.git)?$/);
  if (sshMatch) {
    const [, domain, owner, repo] = sshMatch;
    return {
      domain,
      slug: `${owner}/${repo}`,
    };
  }

  // HTTPS with authentication: https://user@domain/owner/repo.git
  const httpsAuthMatch = cleanUrl.match(
    /^https?:\/\/[^@]+@([^\/]+)\/([^\/]+)\/(.+?)(\.git)?$/,
  );
  if (httpsAuthMatch) {
    const [, domain, owner, repo] = httpsAuthMatch;
    return {
      domain,
      slug: `${owner}/${repo}`,
    };
  }

  // HTTPS format: https://domain/owner/repo.git (without authentication)
  const httpsMatch = cleanUrl.match(
    /^https?:\/\/([^@\/]+)\/([^\/]+)\/(.+?)(\.git)?$/,
  );
  if (httpsMatch) {
    const [, domain, owner, repo] = httpsMatch;
    return {
      domain,
      slug: `${owner}/${repo}`,
    };
  }

  // SSH alternative format: ssh://git@domain/owner/repo.git or ssh://git@domain:port/owner/repo.git
  const sshAltMatch = cleanUrl.match(
    /^ssh:\/\/[^@]+@([^:\/]+)(:[0-9]+)?\/([^\/]+)\/(.+?)(\.git)?$/,
  );
  if (sshAltMatch) {
    const [, domain, , owner, repo] = sshAltMatch;
    return {
      domain,
      slug: `${owner}/${repo}`,
    };
  }

  return null;
}

export function getVcsRemoteInfo(): VcsRemoteInfo | null {
  try {
    const gitRemote = execSync('git remote -v', {
      stdio: 'pipe',
      windowsHide: false,
    })
      .toString()
      .trim();

    if (!gitRemote || gitRemote.length === 0) {
      return null;
    }

    const lines = gitRemote.split('\n').filter((line) => line.trim());
    const remotesPriority = ['origin', 'upstream', 'base'];
    const foundRemotes: { [key: string]: VcsRemoteInfo } = {};
    let firstRemote: VcsRemoteInfo | null = null;

    for (const line of lines) {
      const match = line.trim().match(/^(\w+)\s+(\S+)\s+\((fetch|push)\)$/);
      if (match) {
        const [, remoteName, url] = match;
        const remoteInfo = parseVcsRemoteUrl(url);

        if (remoteInfo && !foundRemotes[remoteName]) {
          foundRemotes[remoteName] = remoteInfo;

          if (!firstRemote) {
            firstRemote = remoteInfo;
          }
        }
      }
    }

    // Return high-priority remote if found
    for (const remote of remotesPriority) {
      if (foundRemotes[remote]) {
        return foundRemotes[remote];
      }
    }

    // Return first found remote
    return firstRemote;
  } catch (e) {
    return null;
  }
}

async function getInstallationSupportsGitHub(apiUrl: string): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const response = await require('axios').get(
      `${apiUrl}/nx-cloud/system/features`,
    );
    if (!response?.data || response.data.message) {
      throw new Error(
        response?.data?.message ?? 'Failed to shorten Nx Cloud URL',
      );
    }
    return !!response.data.isGithubIntegrationEnabled;
  } catch (e) {
    getOutputChannel()
      .appendLine(`Failed to access system features. GitHub integration assumed to be disabled. 
      ${e}`);

    return false;
  }
}

export function getURLifShortenFailed(
  usesGithub: boolean,
  githubSlug: string | null,
  apiUrl: string,
  source: string,
  accessToken?: string,
) {
  if (usesGithub) {
    if (githubSlug) {
      return `${apiUrl}/setup/connect-workspace/github/connect?name=${encodeURIComponent(
        githubSlug,
      )}&source=${source}`;
    } else {
      return `${apiUrl}/setup/connect-workspace/github/select&source=${source}`;
    }
  }
  return `${apiUrl}/setup/connect-workspace/manual?accessToken=${accessToken}&source=${source}`;
}

export function getCloudUrl() {
  return removeTrailingSlash(
    process.env['NX_CLOUD_API'] ||
      process.env['NRWL_API'] ||
      `https://cloud.nx.app`,
  );
}

export function removeTrailingSlash(apiUrl: string) {
  return apiUrl[apiUrl.length - 1] === '/' ? apiUrl.slice(0, -1) : apiUrl;
}

export async function getNxCloudVersion(
  apiUrl: string,
): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const response = await require('axios').get(
      `${apiUrl}/nx-cloud/system/version`,
    );
    const version = removeVersionModifier(response.data.version);
    const isValid = versionIsValid(version);
    if (!version) {
      throw new Error('Failed to extract version from response.');
    }
    if (!isValid) {
      throw new Error(`Invalid version format: ${version}`);
    }
    return version;
  } catch (e) {
    getOutputChannel().appendLine(`Failed to get version of Nx Cloud.
        ${e}`);
    return null;
  }
}

export function removeVersionModifier(versionString: string): string {
  // Cloud version string is in the format of YYMM.DD.BuildNumber-Modifier
  // eslint-disable-next-line no-useless-escape
  return versionString.split(/[\.-]/).slice(0, 3).join('.');
}

export function versionIsValid(version: string): boolean {
  // Updated Regex pattern to require YYMM.DD.BuildNumber format
  // All parts are required, including the BuildNumber.
  const pattern = /^\d{4}\.\d{2}\.\d+$/;
  return pattern.test(version);
}

export function compareCleanCloudVersions(
  version1: string,
  version2: string,
): number {
  const parseVersion = (version: string) => {
    // The format we're using is YYMM.DD.BuildNumber
    const parts = version.split('.').map((part) => parseInt(part, 10));
    return {
      yearMonth: parts[0],
      day: parts[1],
      buildNumber: parts[2],
    };
  };

  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);

  if (v1.yearMonth !== v2.yearMonth) {
    return v1.yearMonth > v2.yearMonth ? 1 : -1;
  }
  if (v1.day !== v2.day) {
    return v1.day > v2.day ? 1 : -1;
  }
  if (v1.buildNumber !== v2.buildNumber) {
    return v1.buildNumber > v2.buildNumber ? 1 : -1;
  }

  return 0;
}
