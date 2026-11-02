import { Logger } from '@nx-console/shared-utils';
import { getNxCloudId, getNxAccessToken, getNxCloudUrl } from './cloud-ids';
import { getNxCloudConfigIni } from './nx-cloud-config-ini';
import {
  getNxCloudOAuthAccessToken,
  NX_CLOUD_OAUTH_ACCESS_TOKEN_HEADER,
  rejectNxCloudOAuthAccessToken,
} from './nx-cloud-oauth';

type NxCloudHeaders = Partial<
  Record<
    | 'Nx-Cloud-Id'
    | 'Nx-Cloud-Personal-Access-Token'
    | typeof NX_CLOUD_OAUTH_ACCESS_TOKEN_HEADER
    | 'Authorization',
    string
  >
>;

// the OAuth access token last sent for each workspace, so that a rejection of
// it can be answered with fresh headers for the same workspace
const sentAccessTokens = new Map<
  string,
  { accessToken: string; logger?: Logger }
>();

export async function nxCloudAuthHeaders(
  workspacePath: string,
  logger?: Logger,
): Promise<NxCloudHeaders> {
  const nxCloudUrl = await getNxCloudUrl(workspacePath);
  const nxCloudId = await getNxCloudId(workspacePath);
  const nxCloudConfigIni = getNxCloudConfigIni();
  const accessToken = await getNxAccessToken(workspacePath);
  const oauthAccessToken = await getNxCloudOAuthAccessToken(
    workspacePath,
    nxCloudUrl,
    logger,
  );

  const personalAccessToken =
    nxCloudConfigIni?.[nxCloudUrl]?.personalAccessToken;

  const headers = {};

  if (nxCloudId) {
    headers['Nx-Cloud-Id'] = nxCloudId;
  }
  // like the nx-cloud client, prefer an OAuth login over a personal access token
  if (oauthAccessToken) {
    headers[NX_CLOUD_OAUTH_ACCESS_TOKEN_HEADER] = oauthAccessToken;
    sentAccessTokens.set(workspacePath, {
      accessToken: oauthAccessToken,
      logger,
    });
  } else if (personalAccessToken) {
    headers['Nx-Cloud-Personal-Access-Token'] = personalAccessToken;
  }
  if (accessToken) {
    headers['Authorization'] = accessToken;
  }
  return headers;
}

/**
 * Returns the headers to retry a request with after Nx Cloud rejected the
 * OAuth access token it was sent with: a refreshed token, or the other
 * credentials when the login could not be refreshed. Returns undefined when
 * the token did not come from `nxCloudAuthHeaders`.
 */
export async function nxCloudAuthHeadersAfterOAuthRejection(
  rejectedAccessToken: string,
): Promise<NxCloudHeaders | undefined> {
  for (const [workspacePath, sent] of sentAccessTokens) {
    if (sent.accessToken === rejectedAccessToken) {
      sent.logger?.log('Nx Cloud rejected the OAuth access token');
      rejectNxCloudOAuthAccessToken(rejectedAccessToken);
      return nxCloudAuthHeaders(workspacePath, sent.logger);
    }
  }
  return undefined;
}
