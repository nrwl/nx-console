import { Logger } from '@nx-console/shared-utils';
import { xhr } from 'request-light';
import { isNxCloudUsed } from './is-nx-cloud-used';
import { getNxCloudUrl } from './cloud-ids';
import { nxCloudAuthHeaders } from './nx-cloud-auth-headers';
import { TaskSummary } from './get-run-details';

export interface TaskSearchRequest {
  workspaceId: string;
  runIds?: string[];
  pipelineExecutionIds?: string[];
  taskIds?: string[];
  projectNames?: string[];
  targets?: string[];
  configurations?: string[];
  hashes?: string[];
  statuses?: string[];
  cacheStatuses?: string[];
  minStartTimeMs?: number;
  maxStartTimeMs?: number;
  limit?: number;
  pageToken?: string;
}

export interface TaskSearchResponse {
  items: TaskSummary[];
  nextPageToken?: string;
}

export interface TaskSearchError {
  type: 'authentication' | 'network' | 'other';
  message: string;
}

export async function getTasksSearch(
  workspacePath: string,
  logger: Logger,
  request: TaskSearchRequest,
): Promise<{
  data?: TaskSearchResponse;
  error?: TaskSearchError;
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
  const url = `${nxCloudUrl}/nx-cloud/mcp-context/tasks/search`;

  const headers: any = {
    'Content-Type': 'application/json',
    ...(await nxCloudAuthHeaders(workspacePath)),
  };

  const data = JSON.stringify(request);

  logger.log(`Making tasks search request`);
  try {
    const response = await xhr({
      type: 'POST',
      url,
      headers,
      data,
      timeout: 10000,
    });

    const responseData = JSON.parse(
      response.responseText,
    ) as TaskSearchResponse;
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
