// THIS ENTIRE LOGIC IS COPIED FROM THE NX REPO
// WE SHOULD CONSIDER MOVING THIS TO THE LIGHT CLIENT AND REUSING IT

import { getOutputChannel } from '@nx-console/vscode/output-channels';
import { execSync } from 'child_process';

export async function createNxCloudOnboardingURL(accessToken?: string) {
  const githubSlug = getGithubSlugOrNull();

  const apiUrl = getCloudUrl();

  const usesGithub = await repoUsesGithub(undefined, githubSlug, apiUrl);

  try {
    const version = await getNxCloudVersion(apiUrl);
    if (
      (version && compareCleanCloudVersions(version, '2406.11.5') < 0) ||
      !version
    ) {
      return apiUrl;
    }
  } catch (e) {
    getOutputChannel().appendLine(`Failed to get Nx Cloud version.
      ${e}`);
    return apiUrl;
  }

  const source = 'nx-console';

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const response = await require('axios').post(
      `${apiUrl}/nx-cloud/onboarding`,
      {
        type: usesGithub ? 'GITHUB' : 'MANUAL',
        source,
        accessToken: usesGithub ? null : accessToken,
        selectedRepositoryName: githubSlug === 'github' ? null : githubSlug,
        meta: undefined,
      }
    );

    if (!response?.data || response.data.message) {
      throw new Error(
        response?.data?.message ?? 'Failed to shorten Nx Cloud URL'
      );
    }

    return `${apiUrl}/connect/${response.data}`;
  } catch (e) {
    getOutputChannel().appendLine(
      `Failed to shorten Nx Cloud URL.
      ${e}`
    );
    return getURLifShortenFailed(
      usesGithub,
      githubSlug === 'github' ? null : githubSlug,
      apiUrl,
      source,
      accessToken
    );
  }
}

export async function repoUsesGithub(
  github?: boolean,
  githubSlug?: string | null,
  apiUrl?: string
): Promise<boolean> {
  if (!apiUrl) {
    apiUrl = getCloudUrl();
  }
  if (!githubSlug) {
    githubSlug = getGithubSlugOrNull();
  }
  const installationSupportsGitHub = await getInstallationSupportsGitHub(
    apiUrl
  );

  return (
    (!!githubSlug || !!github) &&
    (apiUrl.includes('cloud.nx.app') ||
      apiUrl.includes('eu.nx.app') ||
      installationSupportsGitHub)
  );
}

async function getInstallationSupportsGitHub(apiUrl: string): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const response = await require('axios').get(
      `${apiUrl}/nx-cloud/system/features`
    );
    if (!response?.data || response.data.message) {
      throw new Error(
        response?.data?.message ?? 'Failed to shorten Nx Cloud URL'
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

export function getGithubSlugOrNull(): string | null {
  try {
    const gitRemote = execSync('git remote -v', {
      stdio: 'pipe',
      windowsHide: true,
    }).toString();
    // If there are no remotes, we default to github
    if (!gitRemote || gitRemote.length === 0) {
      return 'github';
    }
    return extractUserAndRepoFromGitHubUrl(gitRemote);
  } catch (e) {
    // Probably git is not set up, so we default to github
    return 'github';
  }
}

export function extractUserAndRepoFromGitHubUrl(
  gitRemotes: string
): string | null {
  const regex =
    /^\s*(\w+)\s+(git@github\.com:|https:\/\/github\.com\/)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\.git/gm;
  const remotesPriority = ['origin', 'upstream', 'base'];
  const foundRemotes: { [key: string]: string } = {};
  let firstGitHubUrl: string | null = null;
  let match;

  while ((match = regex.exec(gitRemotes)) !== null) {
    const remoteName = match[1];
    const url = match[2] + match[3] + '/' + match[4] + '.git';
    foundRemotes[remoteName] = url;

    if (!firstGitHubUrl) {
      firstGitHubUrl = url;
    }
  }

  for (const remote of remotesPriority) {
    if (foundRemotes[remote]) {
      return parseGitHubUrl(foundRemotes[remote]);
    }
  }

  return firstGitHubUrl ? parseGitHubUrl(firstGitHubUrl) : null;
}

function parseGitHubUrl(url: string): string | null {
  const sshPattern =
    /git@github\.com:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\.git/;
  const httpsPattern =
    /https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\.git/;
  const match = url.match(sshPattern) || url.match(httpsPattern);

  if (match) {
    return `${match[1]}/${match[2]}`;
  }
  return null;
}

export function getURLifShortenFailed(
  usesGithub: boolean,
  githubSlug: string | null,
  apiUrl: string,
  source: string,
  accessToken?: string
) {
  if (usesGithub) {
    if (githubSlug) {
      return `${apiUrl}/setup/connect-workspace/github/connect?name=${encodeURIComponent(
        githubSlug
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
      `https://cloud.nx.app`
  );
}

export function removeTrailingSlash(apiUrl: string) {
  return apiUrl[apiUrl.length - 1] === '/' ? apiUrl.slice(0, -1) : apiUrl;
}

export async function getNxCloudVersion(
  apiUrl: string
): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const response = await require('axios').get(
      `${apiUrl}/nx-cloud/system/version`
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
  version2: string
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
