import { Logger, httpRequest, HttpError } from '@nx-console/shared-utils';
import { isNxCloudUsed } from './is-nx-cloud-used';
import { getNxCloudUrl } from './cloud-ids';
import { nxCloudAuthHeaders } from './nx-cloud-auth-headers';
import { Result } from './result';

export interface TaskSummary {
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
}

export interface MMachineInfo {
  // Define based on your actual MMachineInfo type
  [key: string]: any;
}

export interface MRunMeta {
  // Define based on your actual MRunMeta type
  [key: string]: any;
}

export interface RunDetails {
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
  updatedAtMs: number;
  cacheEnabled: boolean;
  nxVersion?: string;
  tasks: TaskSummary[];
  machineInfo?: MMachineInfo;
  meta?: MRunMeta;
  inner?: boolean;
  distributedExecutionId?: string;
  clientInstanceId?: string;
}

export interface RunDetailsError {
  type: 'authentication' | 'network' | 'not_found' | 'other';
  message: string;
}

export async function getRunDetails(
  workspacePath: string,
  logger: Logger,
  runId: string,
): Promise<Result<RunDetails, RunDetailsError>> {
  if (!(await isNxCloudUsed(workspacePath, logger))) {
    return {
      error: {
        type: 'other',
        message: 'Nx Cloud is not used in this workspace',
      },
    };
  }

  const nxCloudUrl = await getNxCloudUrl(workspacePath);
  const url = `${nxCloudUrl}/nx-cloud/mcp-context/runs/${runId}`;

  const headers: any = {
    'Content-Type': 'application/json',
    ...(await nxCloudAuthHeaders(workspacePath)),
  };

  logger.log(`Making run details request for ID: ${runId}`);
  try {
    const response = await httpRequest({
      type: 'GET',
      url,
      headers,
      timeout: 10000,
    });

    const responseData = JSON.parse(response.responseText) as RunDetails;
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
    if (e instanceof HttpError && e.status === 404) {
      logger.log(`Run not found: ${e.responseText}`);
      return {
        error: {
          type: 'not_found',
          message: `Run with ID ${runId} not found`,
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

export function formatRunDetailsContent(run: RunDetails): string[] {
  const content: string[] = [];

  let runDetailsText = `Run Details for ID: ${run.id}\n`;
  runDetailsText += `Command: ${run.command}\n`;
  runDetailsText += `Status: ${run.status}, Task Count: ${run.taskCount}\n`;
  runDetailsText += `Duration: ${Math.round(run.durationMs / 1000)}s\n`;
  runDetailsText += `Started: ${new Date(run.startTimeMs).toISOString()}`;

  content.push(runDetailsText);

  if (run.tasks && run.tasks.length > 0) {
    let tasksText = `Tasks (${run.tasks.length}):`;
    for (const task of run.tasks.slice(0, 10)) {
      // Limit to first 10 tasks
      tasksText += `\n- ${task.projectName}:${task.target} (${task.status}) - ${Math.round(task.durationMs / 1000)}s`;
    }
    if (run.tasks.length > 10) {
      tasksText += `\n... and ${run.tasks.length - 10} more tasks`;
    }
    content.push(tasksText);
  }

  return content;
}
