import { Logger, httpRequest, HttpError } from '@nx-console/shared-utils';
import { isNxCloudUsed } from './is-nx-cloud-used';
import { getNxCloudUrl } from './cloud-ids';
import { nxCloudAuthHeaders } from './nx-cloud-auth-headers';

export interface AgentMetadataSummary {
  launchTemplate?: string;
  onlineAtMs?: number;
  offlineAtMs?: number;
  targetCount: number;
}

export interface LinkedWorkflowSummary {
  id: string;
  type: string;
  workflowConfig: string;
}

export interface AssignmentRule {
  // Define based on your actual AssignmentRule type
  [key: string]: any;
}

export interface PipelineExecutionRunGroupDetails {
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
  stopAgentsOnFailure: boolean;
  criticalErrorMessage?: string;
  stopAgentsAfter?: string;
  agentIds: string[];
  closed: boolean;
  requireExplicitCompletion: boolean;
  linkedWorkflows: LinkedWorkflowSummary[];
  activeAgentIds: string[];
  assignmentRules?: AssignmentRule[];
  agentsMetadataSummary: Record<string, AgentMetadataSummary>;
  summaryMessage?: string;
}

export interface MCiVCSContext {
  // Define based on your actual MCiVCSContext type
  [key: string]: any;
}

export interface MWorkflowError {
  // Define based on your actual MWorkflowError type
  [key: string]: any;
}

export interface PipelineExecutionDetails {
  id: string;
  workspaceId: string;
  ciExecutionId: string;
  branch: string;
  status: string;
  createdAtMs: number;
  updatedAtMs: number;
  completedAtMs?: number;
  durationMs?: number;
  runGroups: PipelineExecutionRunGroupDetails[];
  vcsTitle?: string;
  commitSha?: string;
  author?: string;
  repositoryUrl?: string;
  affectedProjectRatio?: number;
  touchedProjectCount: number;
  affectedProjectCount?: number;
  criticalWorkflowErrorCount: number;
  cacheEnabled: boolean;
  vcsContext?: MCiVCSContext;
  cancellationRequested?: boolean;
  touchedProjects?: string[];
  affectedProjects?: string[];
  criticalWorkflowErrors: MWorkflowError[];
  projectGraphSha?: string;
  fileMapSha?: string;
  hashScope?: string;
}

export interface PipelineExecutionDetailsError {
  type: 'authentication' | 'network' | 'not_found' | 'other';
  message: string;
}

export async function getPipelineExecutionDetails(
  workspacePath: string,
  logger: Logger,
  pipelineExecutionId: string,
): Promise<{
  data?: PipelineExecutionDetails;
  error?: PipelineExecutionDetailsError;
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
  const url = `${nxCloudUrl}/nx-cloud/mcp-context/pipeline-executions/${pipelineExecutionId}`;

  const headers: any = {
    'Content-Type': 'application/json',
    ...(await nxCloudAuthHeaders(workspacePath)),
  };

  logger.log(
    `Making pipeline execution details request for ID: ${pipelineExecutionId}`,
  );
  try {
    const response = await httpRequest({
      type: 'GET',
      url,
      headers,
      timeout: 10000,
    });

    const responseData = JSON.parse(
      response.responseText,
    ) as PipelineExecutionDetails;
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
      logger.log(`Pipeline execution not found: ${e.responseText}`);
      return {
        error: {
          type: 'not_found',
          message: `Pipeline execution with ID ${pipelineExecutionId} not found`,
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

export function formatPipelineExecutionDetailsContent(
  execution: PipelineExecutionDetails,
): string[] {
  const content: string[] = [];

  let detailsText = `Pipeline Execution Details for ID: ${execution.id}\n`;
  detailsText += `Branch: ${execution.branch}, Status: ${execution.status}\n`;
  detailsText += `Created: ${new Date(execution.createdAtMs).toISOString()}`;
  if (execution.completedAtMs) {
    detailsText += `\nCompleted: ${new Date(execution.completedAtMs).toISOString()}`;
  }
  if (execution.durationMs) {
    detailsText += `\nDuration: ${Math.round(execution.durationMs / 1000)}s`;
  }

  content.push(detailsText);

  let runGroupsText = `Run Groups (${execution.runGroups.length}):`;
  for (const runGroup of execution.runGroups) {
    runGroupsText += `\n- ${runGroup.runGroupName}: ${runGroup.status}`;
  }
  content.push(runGroupsText);

  return content;
}
