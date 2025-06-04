import { Logger } from '@nx-console/shared-utils';
import { xhr } from 'request-light';
import { isNxCloudUsed } from './is-nx-cloud-used';
import { getNxCloudUrl } from './cloud-ids';
import { nxCloudAuthHeaders } from './nx-cloud-auth-headers';

export interface FailedTaskAttemptSummary {
  startTimeMs: number;
  endTimeMs: number;
  durationMs: number;
  status: string;
  runId: string;
}

export interface MTaskMeta {
  // Define based on your actual MTaskMeta type
  [key: string]: any;
}

export interface TaskDetails {
  taskId: string;
  runId?: string;
  projectName: string;
  target: string;
  startTimeMs: number;
  endTimeMs: number;
  durationMs: number;
  status: string;
  cacheStatus: string;
  isCacheable: boolean;
  hash: string;
  targetGroupName?: string;
  params: string;
  artifactId?: string;
  priorAttempts: FailedTaskAttemptSummary[];
  terminalOutputUploadedToFileStorage: boolean;
  parallelism: boolean;
  meta?: MTaskMeta;
  continuous: boolean;
  batchId?: string;
  associatedBatches: string[];
  uploadedToStorage?: boolean;
  hashScope?: string;
}

export interface TaskDetailsError {
  type: 'authentication' | 'network' | 'not_found' | 'other';
  message: string;
}

export async function getTaskDetails(
  workspacePath: string,
  logger: Logger,
  runId: string,
  encodedTaskId: string,
): Promise<{
  data?: TaskDetails;
  error?: TaskDetailsError;
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
  const url = `${nxCloudUrl}/nx-cloud/mcp-context/runs/${runId}/tasks/${encodedTaskId}`;

  const headers: any = {
    'Content-Type': 'application/json',
    ...(await nxCloudAuthHeaders(workspacePath)),
  };

  logger.log(
    `Making task details request for run ID: ${runId}, task ID: ${encodedTaskId}`,
  );
  try {
    const response = await xhr({
      type: 'GET',
      url,
      headers,
      timeout: 10000,
    });

    const responseData = JSON.parse(response.responseText) as TaskDetails;
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
    if (e.status === 404) {
      logger.log(`Task not found: ${e.responseText}`);
      const decodedTaskId = decodeURIComponent(encodedTaskId);
      return {
        error: {
          type: 'not_found',
          message: `Task with ID ${decodedTaskId} not found in run ${runId}`,
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
