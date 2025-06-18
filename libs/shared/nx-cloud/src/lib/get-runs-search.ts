import { Logger } from '@nx-console/shared-utils';
import { xhr } from 'request-light';
import { isNxCloudUsed } from './is-nx-cloud-used';
import { getNxCloudUrl } from './cloud-ids';
import { nxCloudAuthHeaders } from './nx-cloud-auth-headers';

export interface RunSearchRequest {
  pipelineExecutionId?: string;
  branches?: string[];
  runGroups?: string[];
  commitShas?: string[];
  statuses?: string[];
  minStartTime?: string;
  maxStartTime?: string;
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

export function formatRunsSearchContent(data: RunSearchResponse): string[] {
  const content: string[] = [];

  if (data.items && data.items.length > 0) {
    content.push(`Found ${data.items.length} runs:`);

    for (const run of data.items) {
      let runText = `- Run ID: ${run.id}\n`;
      runText += `  Command: ${run.command}\n`;
      runText += `  Status: ${run.status}, Tasks: ${run.taskCount}\n`;
      runText += `  Duration: ${Math.round(run.durationMs / 1000)}s`;
      if (run.branch) {
        runText += `\n  Branch: ${run.branch}`;
      }
      content.push(runText);
    }

    if (data.nextPageToken) {
      content.push(`Next page token: ${data.nextPageToken}`);
    }
  } else {
    content.push('No runs found matching the criteria.');
  }

  return content;
}
