import { nxWorkspace } from '@nx-console/shared/workspace';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { getWorkspacePath } from '@nx-console/vscode/utils';
import { GraphQLClient } from 'graphql-request';
import { commands, window } from 'vscode';

const orgId = 'myorgid';
const authorization = 'hah you wish';
export async function claimNxCloudWorkspace(): Promise<void> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    window.showErrorMessage('No access token found in nx.json');
    return;
  }

  const endpoint = 'https://cloud.nx.app/api';
  const graphQLClient = new GraphQLClient(endpoint, {
    headers: {
      authorization,
    },
  });

  const mutation = ` mutation ($input: ConnectWorkspaceUsingTokenInput!) {
    connectWorkspaceUsingToken(input: $input) {
      result
      error
      orgId
      workspaceId
    }
  }`;
  const variables = {
    input: {
      accessToken,
      orgId,
    },
  };

  const data = await graphQLClient.request(mutation, variables);
  // if (data.connectWorkspaceUsingToken.result === 'success') {
  // }
  WorkspaceConfigurationStore.instance.set(
    'nxCoudWorkspaceId',
    data.connectWorkspaceUsingToken.workspaceId
  );
  commands.executeCommand('setContext', 'isCloudWorkspaceClaimed', true);
  console.log(data);
}

// export async function checkWorkspaceIsClaimed(): Promise<void> {
//   const accessToken = await getAccessToken();
//   if (!accessToken) {
//     window.showErrorMessage('No access token found in nx.json');
//     return;
//   }

//   const endpoint = 'https://cloud.nx.app/api';
//   const graphQLClient = new GraphQLClient(endpoint, {
//     headers: {
//       authorization,
//     },
//   });

//   const query = ` query {
//     currentUser {
//       cloudOrganizations {
//         id
//         name
//         workspaces {
//           id
//           name
//         }
//       }
//     }
//   }`;

//   const data = await graphQLClient.request(query);
//   console.log(data);
// }

async function getAccessToken(): Promise<string | undefined> {
  return (await nxWorkspace(getWorkspacePath()))?.workspace?.tasksRunnerOptions
    ?.default.options.accessToken;
}
