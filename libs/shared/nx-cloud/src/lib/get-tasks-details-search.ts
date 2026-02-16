import { Logger, HttpError } from '@nx-console/shared-utils';
import { isNxCloudUsed } from './is-nx-cloud-used';
import { getNxCloudUrl } from './cloud-ids';
import { nxCloudAuthHeaders } from './nx-cloud-auth-headers';
import { nxCloudRequest } from './nx-cloud-request';

export interface DateValue {
  date: string;
  value: number;
}

export interface TaskStatisticDetails {
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
  rawRemoteCacheHitDurations: DateValue[];
  rawLocalCacheHitDurations: DateValue[];
  rawCacheMissDurations: DateValue[];
  rawRemoteCacheHitRates: DateValue[];
  rawLocalCacheHitRates: DateValue[];
  rawCacheMissRates: DateValue[];
  rawSuccessRates: DateValue[];
  rawFailureRates: DateValue[];
  rawTotalCounts: DateValue[];
}

export interface TaskDetailsSearchRequest {
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

export interface TaskDetailsSearchResponse {
  items: TaskStatisticDetails[];
  nextPageToken?: string;
}

export interface TaskDetailsSearchError {
  type: 'authentication' | 'network' | 'other';
  message: string;
}

export async function getTasksDetailsSearch(
  workspacePath: string,
  logger: Logger,
  request: TaskDetailsSearchRequest,
): Promise<{
  data?: TaskDetailsSearchResponse;
  error?: TaskDetailsSearchError;
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
  const url = `${nxCloudUrl}/nx-cloud/mcp-context/tasks/details`;

  const headers: any = {
    'Content-Type': 'application/json',
    ...(await nxCloudAuthHeaders(workspacePath)),
  };

  const data = JSON.stringify(request);

  logger.log(`Making tasks details search request`);
  try {
    const response = await nxCloudRequest('TASKS_DETAILS_SEARCH', {
      type: 'POST',
      url,
      headers,
      data,
      timeout: 10000,
    });

    const responseData = JSON.parse(
      response.responseText,
    ) as TaskDetailsSearchResponse;
    return {
      data: responseData,
    };
  } catch (e) {
    if (e instanceof HttpError && e.status === 401) {
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
        message: e instanceof HttpError ? e.responseText : (e as Error).message,
      },
    };
  }
}

export function formatTasksDetailsSearchContent(
  data: TaskDetailsSearchResponse,
): string[] {
  const content: string[] = [];

  if (data.items && data.items.length > 0) {
    content.push(`Found ${data.items.length} detailed task statistics:`);

    for (const task of data.items) {
      let taskText = `=== ${task.projectName}:${task.target} ===\n`;
      taskText += `Environment: ${task.isCI ? 'CI' : 'Local'}\n`;
      taskText += `Total Executions: ${task.totalCount}\n\n`;

      // Summary statistics
      taskText += `SUMMARY STATISTICS:\n`;
      taskText += `- Average Success Rate: ${(task.avgSuccessRate * 100).toFixed(3)}%\n`;
      taskText += `- Average Failure Rate: ${(task.avgFailureRate * 100).toFixed(3)}%\n`;
      taskText += `- Average Remote Cache Hit Rate: ${(task.avgRemoteCacheHitRate * 100).toFixed(3)}%\n`;
      taskText += `- Average Local Cache Hit Rate: ${(task.avgLocalCacheHitRate * 100).toFixed(3)}%\n`;
      taskText += `- Average Cache Miss Rate: ${(task.avgCacheMissRate * 100).toFixed(3)}%\n`;
      taskText += `- Average Remote Cache Hit Duration: ${task.avgRemoteCacheHitDurationMs.toFixed(2)}ms\n`;
      taskText += `- Average Local Cache Hit Duration: ${task.avgLocalCacheHitDurationMs.toFixed(2)}ms\n`;
      taskText += `- Average Cache Miss Duration: ${task.avgCacheMissDurationMs.toFixed(2)}ms\n\n`;

      // Raw time series data
      taskText += `RAW TIME SERIES DATA:\n\n`;

      if (task.rawSuccessRates.length > 0) {
        taskText += `Success Rates by Date:\n`;
        task.rawSuccessRates.forEach((entry) => {
          taskText += `  ${entry.date}: ${(entry.value * 100).toFixed(3)}%\n`;
        });
        taskText += `\n`;
      }

      if (task.rawFailureRates.length > 0) {
        taskText += `Failure Rates by Date:\n`;
        task.rawFailureRates.forEach((entry) => {
          taskText += `  ${entry.date}: ${(entry.value * 100).toFixed(3)}%\n`;
        });
        taskText += `\n`;
      }

      if (task.rawRemoteCacheHitRates.length > 0) {
        taskText += `Remote Cache Hit Rates by Date:\n`;
        task.rawRemoteCacheHitRates.forEach((entry) => {
          taskText += `  ${entry.date}: ${(entry.value * 100).toFixed(3)}%\n`;
        });
        taskText += `\n`;
      }

      if (task.rawLocalCacheHitRates.length > 0) {
        taskText += `Local Cache Hit Rates by Date:\n`;
        task.rawLocalCacheHitRates.forEach((entry) => {
          taskText += `  ${entry.date}: ${(entry.value * 100).toFixed(3)}%\n`;
        });
        taskText += `\n`;
      }

      if (task.rawCacheMissRates.length > 0) {
        taskText += `Cache Miss Rates by Date:\n`;
        task.rawCacheMissRates.forEach((entry) => {
          taskText += `  ${entry.date}: ${(entry.value * 100).toFixed(3)}%\n`;
        });
        taskText += `\n`;
      }

      if (task.rawRemoteCacheHitDurations.length > 0) {
        taskText += `Remote Cache Hit Durations by Date (ms):\n`;
        task.rawRemoteCacheHitDurations.forEach((entry) => {
          taskText += `  ${entry.date}: ${entry.value.toFixed(2)}ms\n`;
        });
        taskText += `\n`;
      }

      if (task.rawLocalCacheHitDurations.length > 0) {
        taskText += `Local Cache Hit Durations by Date (ms):\n`;
        task.rawLocalCacheHitDurations.forEach((entry) => {
          taskText += `  ${entry.date}: ${entry.value.toFixed(2)}ms\n`;
        });
        taskText += `\n`;
      }

      if (task.rawCacheMissDurations.length > 0) {
        taskText += `Cache Miss Durations by Date (ms):\n`;
        task.rawCacheMissDurations.forEach((entry) => {
          taskText += `  ${entry.date}: ${entry.value.toFixed(2)}ms\n`;
        });
        taskText += `\n`;
      }

      if (task.rawTotalCounts.length > 0) {
        taskText += `Total Execution Counts by Date:\n`;
        task.rawTotalCounts.forEach((entry) => {
          taskText += `  ${entry.date}: ${entry.value} executions\n`;
        });
      }

      content.push(taskText);
    }

    if (data.nextPageToken) {
      content.push(`Next page token: ${data.nextPageToken}`);
    }
  } else {
    content.push('No detailed task statistics found matching the criteria.');
  }

  return content;
}
