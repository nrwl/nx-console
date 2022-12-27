export interface RunDetailsResponse {
  linkId: string;
  workspaceId: string;
  command: string;
  startTime: string;
  endTime: string;
  branch: string;
  runGroup: string;
  tasks: RunTask[];
}

export interface RunDetails {
  command: string;
  success: boolean;
  linkId: string;
  cacheHit: boolean;
  runTime: number;
}

export interface RunTask {
  status: 0 | 1;
  projectName: string;
  cacheStatus: 'cache-miss' | 'local-cache-hit' | 'remote-cache-hit';
  startTime: string;
  endTime: string;
}

export function mapResponseToRunDetails(
  response: RunDetailsResponse
): RunDetails {
  return {
    command: response.command,
    success: response.tasks.every((task) => task.status === 0),
    cacheHit: response.tasks.every(
      (task) =>
        task.cacheStatus === 'local-cache-hit' ||
        task.cacheStatus === 'remote-cache-hit'
    ),
    runTime: Math.floor(
      new Date(response.endTime).getTime() -
        new Date(response.startTime).getTime()
    ),
    linkId: response.linkId,
  };
}

export type ConnectWorkspaceUsingTokenResponse = {
  connectWorkspaceUsingToken: {
    result: string;
    error?: string;
    orgId: string;
    workspaceId: string;
  };
};

export type GetWorkspaceDetailsByTokenResponse = {
  workspaceByToken: {
    result: string;
    workspace: { claimed: boolean; id: string; orgId: string };
  };
};

export type GetUserDetailsResponse = {
  currentUser: {
    cloudOrganizations: { name: string; id: string }[];
  };
};

export type VCSIntegrationStatusResponse = {
  workspaces: {
    stats: {
      vcsIntegration: {
        isConnected: boolean;
        isLegacyIntegration: boolean;
      };
    };
  }[];
};

export type VCSIntegrationStatusOptions = 'new' | 'legacy' | 'disconnected';
