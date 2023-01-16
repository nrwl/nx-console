import { getNxCloudRunnerOptions } from '@nx-console/vscode/nx-workspace';
import request, { gql } from 'graphql-request';
import { authentication } from 'vscode';
import {
  ConnectWorkspaceUsingTokenResponse,
  GetUserDetailsResponse,
  GetWorkspaceDetailsByTokenResponse,
  mapResponseToRunDetails,
  RunDetails,
  RunDetailsResponse,
  VCSIntegrationStatusOptions,
  VCSIntegrationStatusResponse,
} from './models';

export class NxCloudApiService {
  constructor(private endpoint: string) {}
  async claimCloudWorkspace(
    orgId: string
  ): Promise<ConnectWorkspaceUsingTokenResponse> {
    const nxAccessToken = (await getNxCloudRunnerOptions())?.accessToken;

    const authAccessToken = await this.getAuthAccessToken();

    if (!authAccessToken) {
      throw new Error('No auth access token found');
    }

    const mutation = gql`
      mutation ($input: ConnectWorkspaceUsingTokenInput!) {
        connectWorkspaceUsingToken(input: $input) {
          result
          error
          orgId
          workspaceId
        }
      }
    `;
    const variables = {
      input: {
        accessToken: nxAccessToken,
        orgId,
      },
    };
    const headers = {
      Authorization: `Bearer ${authAccessToken}`,
    };

    const result = await request<ConnectWorkspaceUsingTokenResponse>(
      this.endpoint,
      mutation,
      variables,
      headers
    );

    return result;
  }

  async getWorkspaceDetailsByToken(): Promise<GetWorkspaceDetailsByTokenResponse> {
    const nxAccessToken = (await getNxCloudRunnerOptions())?.accessToken;

    if (!nxAccessToken) {
      throw new Error('No nx access token found.');
    }

    const query = gql`
      query GetWorkspace($accessToken: String!) {
        workspaceByToken(accessToken: $accessToken) {
          result
          workspace {
            id
            name
            orgId
            claimed
            stats {
              hasUsedDTE
            }
          }
        }
      }
    `;

    const variables = {
      accessToken: nxAccessToken,
    };

    const session = await authentication.getSession('nxCloud', [], {
      silent: true,
    });
    const headers = session?.accessToken
      ? {
          Authorization: `Bearer ${session?.accessToken}`,
        }
      : undefined;

    return await request<GetWorkspaceDetailsByTokenResponse>(
      this.endpoint,
      query,
      variables,
      headers
    );
  }

  async getRunDetails(workspaceId: string): Promise<RunDetails[]> {
    if (!workspaceId) {
      throw new Error('No Nx Cloud workspace found.');
    }

    const query = gql`
      query GetRunListPage($workspaceId: ID!) {
        workspaces(workspaceId: $workspaceId) {
          runListPage(
            limit: 20
            offset: 0
            orphans: true
            status: ""
            branch: ""
          ) {
            hasNext
            pageCount
            offset
            limit
            orphans
            runs {
              linkId
              workspaceId
              command
              startTime
              endTime
              branch
              runGroup
              tasks {
                status
                projectName
                cacheStatus
                startTime
                endTime
              }
            }
          }
        }
      }
    `;
    const variables = {
      workspaceId: workspaceId,
    };

    const authAccessToken = await this.getAuthAccessToken();
    const headers = authAccessToken
      ? {
          Authorization: `Bearer ${authAccessToken}`,
        }
      : undefined;

    const data = await request<{
      workspaces: { runListPage: { runs: RunDetailsResponse[] } }[];
    }>(this.endpoint, query, variables, headers);

    const runDetailsResponse = data.workspaces[0].runListPage.runs;

    return runDetailsResponse?.map((res) => mapResponseToRunDetails(res));
  }

  async getUserDetails(): Promise<GetUserDetailsResponse> {
    const query = gql`
      query GetUserDetails {
        currentUser {
          name
          cloudOrganizations {
            name
            id
          }
        }
      }
    `;

    const session = await authentication.getSession('nxCloud', [], {
      silent: true,
    });

    const headers = {
      Authorization: `Bearer ${session?.accessToken}`,
    };

    return await request(this.endpoint, query, {}, headers);
  }

  async getVcsIntegrationStatus(
    workspaceId: string,
    authAccessToken?: string
  ): Promise<VCSIntegrationStatusOptions> {
    const query = gql`
      query VCSIntegration($workspaceId: ID!) {
        workspaces(workspaceId: $workspaceId) {
          stats {
            vcsIntegration {
              isConnected
              isLegacyIntegration
            }
          }
        }
      }
    `;

    const variables = {
      workspaceId,
    };

    const headers = authAccessToken
      ? {
          Authorization: `Bearer ${authAccessToken}`,
        }
      : undefined;

    const data = await request<VCSIntegrationStatusResponse>(
      this.endpoint,
      query,
      variables,
      headers
    );

    const { isConnected, isLegacyIntegration } =
      data.workspaces[0].stats.vcsIntegration;

    if (isConnected && isLegacyIntegration) {
      return 'legacy';
    }
    if (isConnected && !isLegacyIntegration) {
      return 'new';
    }
    return 'disconnected';
  }

  private async getAuthAccessToken() {
    return await authentication
      .getSession('nxCloud', [], { silent: true })
      .then((session) => session?.accessToken);
  }
}
