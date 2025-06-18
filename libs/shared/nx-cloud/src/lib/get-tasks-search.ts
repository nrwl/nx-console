import { Logger } from '@nx-console/shared-utils';
import { xhr } from 'request-light';
import { isNxCloudUsed } from './is-nx-cloud-used';
import { getNxCloudUrl } from './cloud-ids';
import { nxCloudAuthHeaders } from './nx-cloud-auth-headers';

export interface TaskSearchRequest {
  taskIds?: string[];
  projectNames?: string[];
  targets?: string[];
  configurations?: string[];
  minStartTime?: string;
  maxStartTime?: string;
  limit?: number;
  pageToken?: string;
  includeLocal?: boolean;
}

export interface TaskStatisticSummary {
  projectName: string;
  target: string;
  avgRemoteCacheHitDurationMs: number;
  avgLocalCacheHitDurationMs: number;
  avgCacheMissDurationMs: number;
  avgRemoteCacheHitRate: number;
  avgLocalCacheHitRate: number;
  avgCacheMissRate: number;
  totalCount: number;
  avgSuccessRate: number;
  avgFailureRate: number;
  isCI: boolean;
}

export interface TaskSearchResponse {
  items: TaskStatisticSummary[];
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

export function formatTasksSearchContent(data: TaskSearchResponse): string[] {
  const content: string[] = [];

  if (data.items && data.items.length > 0) {
    content.push(`Found ${data.items.length} task statistics:`);

    for (const task of data.items) {
      let taskText = `- ${task.projectName}:${task.target}\n`;
      taskText += `  Total Runs: ${task.totalCount} (${task.isCI ? 'CI' : 'Local'})\n`;
      taskText += `  Success Rate: ${(task.avgSuccessRate * 100).toFixed(1)}%, Failure Rate: ${(task.avgFailureRate * 100).toFixed(1)}%\n`;
      taskText += `  Cache Hit Rates - Remote: ${(task.avgRemoteCacheHitRate * 100).toFixed(1)}%, Local: ${(task.avgLocalCacheHitRate * 100).toFixed(1)}%, Miss: ${(task.avgCacheMissRate * 100).toFixed(1)}%\n`;
      taskText += `  Avg Durations - Remote Hit: ${Math.round(task.avgRemoteCacheHitDurationMs / 1000)}s, Local Hit: ${Math.round(task.avgLocalCacheHitDurationMs / 1000)}s, Cache Miss: ${Math.round(task.avgCacheMissDurationMs / 1000)}s`;

      content.push(taskText);
    }

    if (data.nextPageToken) {
      content.push(`Next page token: ${data.nextPageToken}`);
    }
  } else {
    content.push('No task statistics found matching the criteria.');
  }

  return content;
}
