import { Logger, httpRequest, HttpError } from '@nx-console/shared-utils';
import { isNxCloudUsed } from './is-nx-cloud-used';
import { getNxCloudUrl } from './cloud-ids';
import { nxCloudAuthHeaders } from './nx-cloud-auth-headers';

export interface RetrieveFixDiffResponse {
  branch: string | null;
  commitSha: string | null;
  aiFixId: string | null;
  suggestedFix: string | null;
  suggestedFixDescription: string | null;
  suggestedFixReasoning: string | null;
  suggestedFixStatus: string;
  prTitle: string | null;
  prBody: string | null;
  taskIds: string[] | null;
  /** @deprecated Use remoteTaskSummary and localTaskSummary instead */
  taskOutputSummary?: string | null;
  /** Task output from CI/remote execution */
  remoteTaskSummary?: string | null;
  /** Task output from local execution */
  localTaskSummary?: string | null;
  shortLink: string | null;
  confidence: number | null;
  confidenceReasoning: string | null;
}

export interface RetrieveFixDiffError {
  type: 'authentication' | 'network' | 'not_found' | 'other';
  message: string;
}

export async function retrieveFixDiff(
  workspacePath: string,
  logger: Logger,
  fixShortLink: string,
  suggestionShortLink: string,
): Promise<{
  data?: RetrieveFixDiffResponse;
  error?: RetrieveFixDiffError;
}> {
  if (!(await isNxCloudUsed(workspacePath, logger))) {
    return {
      error: {
        type: 'other',
        message: `Nx Cloud is not used in this workspace (${workspacePath})`,
      },
    };
  }

  const nxCloudUrl = await getNxCloudUrl(workspacePath);
  const url = `${nxCloudUrl}/nx-cloud/retrieve-fix-diff`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await nxCloudAuthHeaders(workspacePath)),
  };

  const data = JSON.stringify({
    fixShortLink,
    suggestionShortLink,
  });

  logger.log(`Making retrieve-fix-diff request`);
  try {
    const response = await httpRequest({
      type: 'POST',
      url,
      headers,
      data,
      timeout: 10000,
    });

    const responseData = JSON.parse(
      response.responseText,
    ) as RetrieveFixDiffResponse;
    return {
      data: responseData,
    };
  } catch (e) {
    if (e instanceof HttpError) {
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
        logger.log(`Not found: ${e.responseText}`);
        return {
          error: {
            type: 'not_found',
            message: e.responseText,
          },
        };
      }
      logger.log(`Error: ${e.status} ${e.responseText}`);
      return {
        error: {
          type: 'other',
          message: e.responseText,
        },
      };
    }

    const errorMessage = e instanceof Error ? e.message : String(e);
    logger.log(`Network error: ${errorMessage}`);
    return {
      error: {
        type: 'network',
        message: errorMessage,
      },
    };
  }
}
