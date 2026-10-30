import { getPackageManagerCommand } from '@nx-console/shared-npm';
import {
  Logger,
  ManagedCommandError,
  runManagedCommand,
} from '@nx-console/shared-utils';
import { getNxCloudConfigIni } from './nx-cloud-config-ini';

export const NX_CLOUD_OAUTH_ACCESS_TOKEN_HEADER = 'Nx-Cloud-OAuth-Access-Token';

// the nx-cloud client also refreshes tokens that expire within a minute
const REFRESH_SKEW_MS = 60_000;
// Requests stop waiting for a refresh after REFRESH_WAIT_MS, but the refresh
// itself runs on: stopping it after Nx Cloud rotated the refresh token and
// before the CLI stored the new one would lose the login.
const REFRESH_WAIT_MS = 30_000;
const REFRESH_TIMEOUT_MS = 5 * 60_000;
const MIN_RETRY_DELAY_MS = 60_000;
const MAX_RETRY_DELAY_MS = 30 * 60_000;

let refreshPromise: Promise<void> | null = null;
let nextRefreshAttempt = 0;
let failedRefreshes = 0;
// the access token that failed refreshes left in nxcloud.ini; once it changes,
// the user has logged in again and the backoff no longer applies
let failedAccessToken: string | undefined;
const rejectedAccessTokens = new Set<string>();

/**
 * Returns the access token that `nx login` stored in nxcloud.ini, or undefined
 * when there is no OAuth login or its token could not be refreshed.
 *
 * Access tokens are short-lived and their refresh tokens rotate, so an expired
 * token is refreshed by the nx-cloud CLI, which owns the stored credential and
 * the lock that guards it.
 */
export async function getNxCloudOAuthAccessToken(
  workspacePath: string,
  nxCloudUrl: string,
  logger?: Logger,
): Promise<string | undefined> {
  const credential = readOAuthCredential(nxCloudUrl);
  if (!credential) {
    return undefined;
  }
  if (isUsable(credential)) {
    return credential.accessToken;
  }

  await refreshOAuthCredential(
    workspacePath,
    nxCloudUrl,
    credential.accessToken,
    logger,
  );

  const refreshed = readOAuthCredential(nxCloudUrl);
  return refreshed && isUsable(refreshed) ? refreshed.accessToken : undefined;
}

/**
 * Whether Nx Cloud answered a request because it does not accept the OAuth
 * access token the request was sent with, for example after it was revoked.
 */
export function isNxCloudOAuthAccessTokenRejection(
  status: number,
  responseText: string,
): boolean {
  if (status !== 401 && status !== 403) {
    return false;
  }
  try {
    return JSON.parse(responseText)?.code === 'OAUTH_ACCESS_TOKEN_INVALID';
  } catch {
    return false;
  }
}

/**
 * Stops handing out an access token that Nx Cloud rejected. The next call to
 * `getNxCloudOAuthAccessToken` refreshes the login right away: the nx-cloud CLI
 * notices the rejection itself and replaces the token.
 */
export function rejectNxCloudOAuthAccessToken(accessToken: string) {
  if (!rejectedAccessTokens.has(accessToken)) {
    rejectedAccessTokens.add(accessToken);
    nextRefreshAttempt = 0;
  }
}

type OAuthCredential = { accessToken: string; expiresAt: number };

function readOAuthCredential(nxCloudUrl: string): OAuthCredential | undefined {
  const section = getNxCloudConfigIni()?.[nxCloudUrl.replace(/\/+$/, '')];
  const accessToken = section?.oauthAccessToken;
  const expiresAt = Date.parse(section?.oauthAccessTokenExpiresAt);
  if (typeof accessToken !== 'string' || !accessToken || isNaN(expiresAt)) {
    return undefined;
  }
  return { accessToken, expiresAt };
}

function isUsable(credential: OAuthCredential): boolean {
  return (
    !rejectedAccessTokens.has(credential.accessToken) &&
    credential.expiresAt > Date.now() + REFRESH_SKEW_MS
  );
}

async function refreshOAuthCredential(
  workspacePath: string,
  nxCloudUrl: string,
  accessToken: string,
  logger?: Logger,
): Promise<void> {
  if (failedAccessToken !== undefined && failedAccessToken !== accessToken) {
    failedAccessToken = undefined;
    failedRefreshes = 0;
    nextRefreshAttempt = 0;
  }
  if (!refreshPromise) {
    if (Date.now() < nextRefreshAttempt) {
      return;
    }
    refreshPromise = runRefresh(
      workspacePath,
      nxCloudUrl,
      accessToken,
      logger,
    ).finally(() => {
      refreshPromise = null;
    });
  }

  let waitTimer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    refreshPromise,
    new Promise<void>((resolve) => {
      waitTimer = setTimeout(resolve, REFRESH_WAIT_MS);
      waitTimer.unref?.();
    }),
  ]);
  clearTimeout(waitTimer);
}

async function runRefresh(
  workspacePath: string,
  nxCloudUrl: string,
  accessToken: string,
  logger?: Logger,
): Promise<void> {
  let failure: string | undefined;
  try {
    const pm = await getPackageManagerCommand(workspacePath);
    // `login --status` refreshes an expiring token, and a token Nx Cloud
    // rejects, before it reports the login
    const command = `${pm.exec} nx-cloud login --status`;
    logger?.log(`Refreshing the Nx Cloud login with \`${command}\``);
    await runManagedCommand(command, {
      cwd: workspacePath,
      timeoutMs: REFRESH_TIMEOUT_MS,
    });
  } catch (e) {
    failure = describeFailure(e);
  }

  const refreshed = readOAuthCredential(nxCloudUrl);
  if (!failure && refreshed && isUsable(refreshed)) {
    failedRefreshes = 0;
    failedAccessToken = undefined;
    // a refreshed token lasts far longer than this, so this only keeps an
    // unexpected state from spawning the CLI on every request
    nextRefreshAttempt = Date.now() + MIN_RETRY_DELAY_MS;
    return;
  }

  failedRefreshes++;
  failedAccessToken = refreshed?.accessToken ?? accessToken;
  const retryDelay = Math.min(
    MIN_RETRY_DELAY_MS * 2 ** (failedRefreshes - 1),
    MAX_RETRY_DELAY_MS,
  );
  nextRefreshAttempt = Date.now() + retryDelay;
  logger?.log(
    `Could not refresh the Nx Cloud login${failure ? `: ${failure}` : ''}. ` +
      `Retrying in ${Math.round(retryDelay / 60_000)} min; run \`nx login\` if the login has expired.`,
  );
}

function describeFailure(e: unknown): string {
  if (!(e instanceof ManagedCommandError)) {
    return e instanceof Error ? e.message : String(e);
  }
  const reason = e.timedOut ? 'timed out' : `exited with code ${e.code}`;
  const output = `${e.stdout}\n${e.stderr}`.trim().slice(-500);
  return output ? `${reason}\n${output}` : reason;
}
