import { Logger } from '@nx-console/shared-utils';
import { xhr } from 'request-light';
import { isNxCloudUsed } from './is-nx-cloud-used';
import { getNxCloudUrl } from './cloud-ids';
import { nxCloudAuthHeaders } from './nx-cloud-auth-headers';

export interface RunSearchRequest {
  workspaceId: string;
  pipelineExecutionId?: string;
  branches?: string[];
  runGroups?: string[];
  commitShas?: string[];
  statuses?: string[];
  minStartTimeMs?: number;
  maxStartTimeMs?: number;
  commandContains?: string;
  urlSlug?: string;
  limit?: number;
  pageToken?: string;
}

export interface RunSummary {
  id: string;
  workspaceId: string;
  urlSlug: string;
  command: string;
  startTimeMs: number;
  endTimeMs: number;
  durationMs: number;
  status: string;
  taskCount: number;
  branch?: string;
  runGroup?: string;
  commitSha?: string;
  createdAtMs: number;
  cacheEnabled: boolean;
  nxVersion?: string;
}

export interface RunSearchResponse {
  items: RunSummary[];
  nextPageToken?: string;
}

export interface RunSearchError {
  type: 'authentication' | 'network' | 'other';
  message: string;
}

export async function getRunsSearch(
  workspacePath: string,
  logger: Logger,
  request: RunSearchRequest,
): Promise<{
  data?: RunSearchResponse;
  error?: RunSearchError;
}> {
  if (!(await isNxCloudUsed(workspacePath, logger))) {
    return {
      error: {
        type: 'other',
        message: 'Nx Cloud is not used in this workspace',
      },
    };
  }

  const nxCloudUrl = await getNxCloudUrl(workspacePath);
  const url = `${nxCloudUrl}/nx-cloud/mcp-context/runs/search`;

  const headers: any = {
    'Content-Type': 'application/json',
    ...(await nxCloudAuthHeaders(workspacePath)),
  };

  const data = JSON.stringify(request);

  logger.log(`Making runs search request`);
  try {
    const response = await xhr({
      type: 'POST',
      url,
      headers,
      data,
      timeout: 10000,
    });

    const responseData = JSON.parse(response.responseText) as RunSearchResponse;
    return {
      data: responseData,
    };
  } catch (e) {
    if (e.status === 401) {
      logger.log(`Authentication error: ${e.responseText}`);
      return {
        error: {
          type: 'authentication',
          message: e.responseText,
        },
      };
    }
    logger.log(`Error: ${JSON.stringify(e)}`);
    return {
      error: {
        type: 'other',
        message: e.responseText ?? e.message,
      },
    };
  }
}
