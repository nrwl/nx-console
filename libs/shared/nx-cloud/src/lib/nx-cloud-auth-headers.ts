import { getNxCloudId, getNxAccessToken, getNxCloudUrl } from './cloud-ids';
import { getNxCloudConfigIni } from './nx-cloud-config-ini';

type NxCloudHeaders = Partial<
  Record<
    'Nx-Cloud-Id' | 'Nx-Cloud-Personal-Access-Token' | 'Authorization',
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

  const personalAccessToken =
    nxCloudConfigIni?.[nxCloudUrl]?.personalAccessToken;

  const headers = {};

  if (nxCloudId) {
    headers['Nx-Cloud-Id'] = nxCloudId;
  }
  if (personalAccessToken) {
    headers['Nx-Cloud-Personal-Access-Token'] = personalAccessToken;
  }
  if (accessToken) {
    headers['Authorization'] = accessToken;
  }
  return headers;
}
