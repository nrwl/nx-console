import { getNxCloudId, getNxAccessToken, getNxCloudUrl } from './cloud-ids';
import { getNxCloudConfigIni } from './nx-cloud-config-ini';
import {
  getNxCloudOAuthAccessToken,
  NX_CLOUD_OAUTH_ACCESS_TOKEN_HEADER,
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

export async function nxCloudAuthHeaders(
  workspacePath: string,
): Promise<NxCloudHeaders> {
  const nxCloudUrl = await getNxCloudUrl(workspacePath);
  const nxCloudId = await getNxCloudId(workspacePath);
  const nxCloudConfigIni = getNxCloudConfigIni();
  const accessToken = await getNxAccessToken(workspacePath);
  const oauthAccessToken = await getNxCloudOAuthAccessToken(
    workspacePath,
    nxCloudUrl,
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
  } else if (personalAccessToken) {
    headers['Nx-Cloud-Personal-Access-Token'] = personalAccessToken;
  }
  if (accessToken) {
    headers['Authorization'] = accessToken;
  }
  return headers;
}
