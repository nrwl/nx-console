import { Logger } from '@nx-console/shared-utils';
import { xhr } from 'request-light';
import { isNxCloudUsed } from './is-nx-cloud-used';
import { getNxCloudUrl } from './cloud-ids';
import { nxCloudAuthHeaders } from './nx-cloud-auth-headers';

export interface PipelineExecutionSearchRequest {
  branches?: string[];
  statuses?: string[];
  authors?: string[];
  repositoryUrl?: string;
  minCreatedAt?: string;
  maxCreatedAt?: string;
  vcsTitleContains?: string;
  limit?: number;
  pageToken?: string;
}

export interface RunGroupSummary {
  runGroupName: string;
  status: string;
  createdAtMs: number;
  completedAtMs?: number;
  durationMs?: number;
  agentCount?: number;
  commandCount?: number;
  ciExecutionEnv: string;
  hasCriticalError: boolean;
  completedBy?: string;
}

export interface PipelineExecutionSummary {
  id: string;
  workspaceId: string;
  ciExecutionId: string;
  branch: string;
  status: string;
  createdAtMs: number;
  updatedAtMs: number;
  completedAtMs?: number;
  durationMs?: number;
  runGroupSummaries: RunGroupSummary[];
  vcsTitle?: string;
  commitSha?: string;
  author?: string;
  repositoryUrl?: string;
  affectedProjectRatio?: number;
  touchedProjectCount: number;
  affectedProjectCount?: number;
  criticalWorkflowErrorCount: number;
  cacheEnabled: boolean;
}

export interface PipelineExecutionSearchResponse {
  items: PipelineExecutionSummary[];
  nextPageToken?: string;
}

export interface PipelineExecutionSearchError {
  type: 'authentication' | 'network' | 'other';
  message: string;
}

export async function getPipelineExecutionsSearch(
  workspacePath: string,
  logger: Logger,
  request: PipelineExecutionSearchRequest,
): Promise<{
  data?: PipelineExecutionSearchResponse;
  error?: PipelineExecutionSearchError;
}> {
  logger.log('workspacePath', workspacePath);

  if (!(await isNxCloudUsed(workspacePath, logger))) {
    return {
      error: {
        type: 'other',
        message: `Nx Cloud is not used in this workspace (${workspacePath})`,
      },
    };
  }

  const nxCloudUrl = await getNxCloudUrl(workspacePath);
  const url = `${nxCloudUrl}/nx-cloud/mcp-context/pipeline-executions/search`;

  const headers: any = {
    'Content-Type': 'application/json',
    ...(await nxCloudAuthHeaders(workspacePath)),
  };

  const data = JSON.stringify(request);

  logger.log(`Making pipeline executions search request`);
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
    ) as PipelineExecutionSearchResponse;
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

export function formatPipelineExecutionsSearchContent(
  data: PipelineExecutionSearchResponse,
): string[] {
  const content: string[] = [];

  if (data.items && data.items.length > 0) {
    content.push(`Found ${data.items.length} pipeline executions:`);

    for (const execution of data.items) {
      let executionText = `- Pipeline Execution ID: ${execution.id}\n`;
      executionText += `  Branch: ${execution.branch}, Status: ${execution.status}\n`;
      executionText += `  Created: ${new Date(execution.createdAtMs).toISOString()}`;
      if (execution.vcsTitle) {
        executionText += `\n  Title: ${execution.vcsTitle}`;
      }
      if (execution.author) {
        executionText += `\n  Author: ${execution.author}`;
      }
      content.push(executionText);
    }

    if (data.nextPageToken) {
      content.push(`Next page token: ${data.nextPageToken}`);
    }
  } else {
    content.push('No pipeline executions found matching the criteria.');
  }

  return content;
}
